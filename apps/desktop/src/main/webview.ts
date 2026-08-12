import { join } from 'node:path'
import { app, type BrowserWindow, type WebContents } from 'electron'
import { IPC, type WebviewLoadError } from '../shared/ipc-channels'
import { type GameRole, isPlayingGame, needsGameRole } from '../shared/presence'
import { isSiteURL, SITE_ORDER, SITES, type SiteId } from '../shared/sites'
import { toZoomFactor } from '../shared/zoom'
import { updateActiveGameState } from './active-game'
import { applyVolume } from './audio'
import { applyChatVisibility } from './chat-visibility'
import { rejectCookieBanners } from './consent'
import { updatePresenceLocation } from './discord'
import { openExternalUrl } from './external-links'
import { probeGameRole } from './game-role'
import { updatePlayingState } from './keep-awake'
import { applyReviewOnLichess } from './lichess-review'
import { isLichessReview } from './lichess-review-state'
import { applyNumberedArrows } from './numbered-arrows'
import { applyPlayerAnonymity } from './player-anonymity'
import { getSettings, setLastSiteUrl } from './store'

const ABORTED_BY_USER = -3
const ROLE_POLL_INTERVAL = 3_000
const NON_PLAYER_CONFIRMATIONS = 2
const UNKNOWN_ATTEMPTS = 3

const siteContents = new Map<SiteId, WebContents>()
const contentsSites = new WeakMap<WebContents, SiteId>()
let roleTimer: NodeJS.Timeout | null = null
let roleUrl = ''
let roleValue: GameRole = 'unknown'
let nonPlayerStreak = 0
let unknownStreak = 0
let rolePublished = false

type GetWindow = () => BrowserWindow | null

export function getSiteWebContents(): WebContents | null {
  const siteId = getSettings().activeSite
  const contents = siteContents.get(siteId)

  if (!contents || contents.isDestroyed()) {
    siteContents.delete(siteId)
    return null
  }

  return contents
}

function isCurrentSiteContents(contents: WebContents): boolean {
  return getSiteWebContents() === contents
}

function siteIdFromURL(url: string): SiteId | null {
  return SITE_ORDER.find((siteId) => isSiteURL(siteId, url)) ?? null
}

function siteIdForContents(contents: WebContents): SiteId | null {
  return contentsSites.get(contents) ?? siteIdFromURL(contents.getURL())
}

function claimSiteContents(contents: WebContents, url: string): SiteId | null {
  const siteId = siteIdFromURL(url)
  const existingSiteId = contentsSites.get(contents)

  if (!siteId || (existingSiteId && existingSiteId !== siteId)) {
    return null
  }

  if (!existingSiteId) {
    contentsSites.set(contents, siteId)
    siteContents.set(siteId, contents)
  }

  return siteId
}

function updateActivePlayingState(getWindow: GetWindow, value: boolean): void {
  updatePlayingState(value)
  updateActiveGameState(getWindow(), value)
}

function stopRolePolling(getWindow: GetWindow): void {
  if (roleTimer) {
    clearInterval(roleTimer)
    roleTimer = null
  }

  roleUrl = ''
  roleValue = 'unknown'
  nonPlayerStreak = 0
  unknownStreak = 0
  rolePublished = false
  updateActivePlayingState(getWindow, false)
}

function publishRole(getWindow: GetWindow, siteId: SiteId, url: string, role: GameRole): void {
  roleValue = role
  rolePublished = true
  updateActivePlayingState(getWindow, isPlayingGame(siteId, url, role))
  updatePresenceLocation(siteId, url, role)
}

async function refreshGameRole(getWindow: GetWindow, siteId: SiteId, url: string): Promise<void> {
  const contents = getSiteWebContents()

  if (!contents || roleUrl !== url || !isSiteURL(siteId, contents.getURL())) {
    return
  }

  const role = await probeGameRole(contents, siteId)

  if (roleUrl !== url) {
    return
  }

  const nonPlayer = role === 'spectating' || role === 'finished' || role === 'aborted'

  nonPlayerStreak = nonPlayer ? nonPlayerStreak + 1 : 0
  unknownStreak = role === 'unknown' ? unknownStreak + 1 : 0

  if (role === 'unknown') {
    if (unknownStreak >= UNKNOWN_ATTEMPTS && !rolePublished) {
      publishRole(getWindow, siteId, url, 'unknown')
    }
    return
  }

  if (nonPlayer && nonPlayerStreak < NON_PLAYER_CONFIRMATIONS) {
    return
  }

  const ownGameEnded =
    role === 'spectating' &&
    (roleValue === 'playing' || roleValue === 'finished' || roleValue === 'aborted')
  const resolved = ownGameEnded ? (roleValue === 'aborted' ? 'aborted' : 'finished') : role

  if (resolved !== roleValue || !rolePublished) {
    publishRole(getWindow, siteId, url, resolved)
  }
}

function trackPresence(getWindow: GetWindow, url: string): void {
  const { activeSite } = getSettings()

  if (!isSiteURL(activeSite, url)) {
    stopRolePolling(getWindow)
    return
  }

  setLastSiteUrl(activeSite, url)

  if (activeSite === 'lichess' && isLichessReview(url)) {
    stopRolePolling(getWindow)
    updatePresenceLocation(activeSite, url, 'reviewing')
    return
  }

  if (!needsGameRole(activeSite, url)) {
    stopRolePolling(getWindow)
    updateActivePlayingState(getWindow, isPlayingGame(activeSite, url))
    updatePresenceLocation(activeSite, url)
    return
  }

  if (roleUrl === url) {
    return
  }

  stopRolePolling(getWindow)
  roleUrl = url

  roleTimer = setInterval(() => {
    void refreshGameRole(getWindow, activeSite, url)
  }, ROLE_POLL_INTERVAL)
  roleTimer.unref()

  void refreshGameRole(getWindow, activeSite, url)
}

export function registerAppCommands(window: BrowserWindow): void {
  window.on('app-command', (_event, command) => {
    const history = getSiteWebContents()?.navigationHistory

    if (!history) {
      return
    }

    if (command === 'browser-backward' && history.canGoBack()) {
      history.goBack()
    } else if (command === 'browser-forward' && history.canGoForward()) {
      history.goForward()
    }
  })
}

export function browserUserAgent(): string {
  const platform =
    process.platform === 'linux'
      ? 'X11; Linux x86_64'
      : process.platform === 'darwin'
        ? 'Macintosh; Intel Mac OS X 10_15_7'
        : 'Windows NT 10.0; Win64; x64'

  return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`
}

export function hardenWebviewAttachment(host: WebContents): void {
  host.on('will-attach-webview', (_event, webPreferences, params) => {
    webPreferences.preload = join(__dirname, '../preload/webview.js')
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true

    if (typeof params.src !== 'string' || !isSiteURL(getSettings().activeSite, params.src)) {
      params.src = SITES[getSettings().activeSite].startUrl
    }
  })
}

function configure(contents: WebContents, getWindow: () => BrowserWindow | null): void {
  claimSiteContents(contents, contents.getURL())
  contents.setUserAgent(browserUserAgent())
  contents.setAudioMuted(getSettings().soundMuted)

  contents.setWindowOpenHandler(({ url }) => {
    const siteId = siteIdForContents(contents)

    if (siteId && isSiteURL(siteId, url)) {
      contents.loadURL(url).catch(() => undefined)
    } else {
      openExternalUrl(url)
    }
    return { action: 'deny' }
  })

  contents.on('will-navigate', (event, url) => {
    const siteId = siteIdForContents(contents) ?? claimSiteContents(contents, url)

    if (!siteId || !isSiteURL(siteId, url)) {
      event.preventDefault()
      openExternalUrl(url)
    }
  })

  contents.on('dom-ready', () => {
    const siteId = claimSiteContents(contents, contents.getURL())

    if (!isCurrentSiteContents(contents)) {
      return
    }

    const settings = getSettings()
    const activeSite = siteId ?? settings.activeSite

    contents.setZoomFactor(toZoomFactor(settings.zoom[activeSite]))
    applyVolume(contents, settings.volume)
    applyChatVisibility(contents, activeSite, settings.hideChat, true)
    applyPlayerAnonymity(contents, activeSite, settings.hideOpponent, settings.hideRatings, true)
    applyNumberedArrows(contents, activeSite, settings.numberedArrows)
    applyReviewOnLichess(contents, activeSite, settings.reviewOnLichess, true)
    rejectCookieBanners(contents)
    trackPresence(getWindow, contents.getURL())
  })

  contents.on('did-navigate', (_event, url) => {
    claimSiteContents(contents, url)
    if (isCurrentSiteContents(contents)) {
      trackPresence(getWindow, url)
    }
  })

  contents.on('did-navigate-in-page', (_event, url, isMainFrame) => {
    if (isMainFrame) {
      claimSiteContents(contents, url)
    }
    if (isMainFrame && isCurrentSiteContents(contents)) {
      trackPresence(getWindow, url)
    }
  })

  contents.on('did-start-loading', () => {
    if (isCurrentSiteContents(contents)) {
      getWindow()?.webContents.send(IPC.webview.loadStart)
    }
  })

  contents.on('did-stop-loading', () => {
    if (isCurrentSiteContents(contents)) {
      getWindow()?.webContents.send(IPC.webview.loadStop)
    }
  })

  contents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (errorCode === ABORTED_BY_USER || !isMainFrame || !isCurrentSiteContents(contents)) {
      return
    }

    const payload: WebviewLoadError = { errorCode, errorDescription, validatedURL }
    getWindow()?.webContents.send(IPC.webview.loadError, payload)
  })

  contents.on('destroyed', () => {
    const siteId = contentsSites.get(contents)
    const wasCurrent = siteId === getSettings().activeSite && siteContents.get(siteId) === contents

    if (siteId && siteContents.get(siteId) === contents) {
      siteContents.delete(siteId)
    }

    if (wasCurrent) {
      stopRolePolling(getWindow)
    }
  })
}

export function activateSite(window: BrowserWindow | null): void {
  const getWindow = (): BrowserWindow | null => window
  stopRolePolling(getWindow)

  const contents = getSiteWebContents()
  if (contents) {
    trackPresence(getWindow, contents.getURL())
  }
}

export function registerWebviewHandling(getWindow: () => BrowserWindow | null): void {
  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() === 'webview') {
      configure(contents, getWindow)
    }
  })
}
