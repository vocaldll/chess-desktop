import { join } from 'node:path'
import { app, type BrowserWindow, shell, type WebContents } from 'electron'
import { IPC, type WebviewLoadError } from '../shared/ipc-channels'
import { type GameRole, isPlayingGame, needsGameRole } from '../shared/presence'
import { isOpenableExternally, isSiteURL, SITES, type SiteId } from '../shared/sites'
import { toZoomFactor } from '../shared/zoom'
import { applyVolume } from './audio'
import { rejectCookieBanners } from './consent'
import { updatePresenceLocation } from './discord'
import { probeGameRole } from './game-role'
import { updatePlayingState } from './keep-awake'
import { getSettings, setLastSiteUrl } from './store'

const ABORTED_BY_USER = -3
const ROLE_POLL_INTERVAL = 3_000
const NON_PLAYER_CONFIRMATIONS = 2
const UNKNOWN_ATTEMPTS = 3

let siteContents: WebContents | null = null
let roleTimer: NodeJS.Timeout | null = null
let roleUrl = ''
let roleValue: GameRole = 'unknown'
let nonPlayerStreak = 0
let unknownStreak = 0
let rolePublished = false

export function getSiteWebContents(): WebContents | null {
  return siteContents && !siteContents.isDestroyed() ? siteContents : null
}

function isActiveSiteURL(url: string): boolean {
  return isSiteURL(getSettings().activeSite, url)
}

function stopRolePolling(): void {
  if (roleTimer) {
    clearInterval(roleTimer)
    roleTimer = null
  }

  roleUrl = ''
  roleValue = 'unknown'
  nonPlayerStreak = 0
  unknownStreak = 0
  rolePublished = false
  updatePlayingState(false)
}

function publishRole(siteId: SiteId, url: string, role: GameRole): void {
  roleValue = role
  rolePublished = true
  updatePlayingState(isPlayingGame(siteId, url, role))
  updatePresenceLocation(siteId, url, role)
}

async function refreshGameRole(siteId: SiteId, url: string): Promise<void> {
  const contents = getSiteWebContents()

  if (!contents || roleUrl !== url) {
    return
  }

  const role = await probeGameRole(contents, siteId)

  if (roleUrl !== url) {
    return
  }

  const nonPlayer = role === 'spectating' || role === 'finished'

  nonPlayerStreak = nonPlayer ? nonPlayerStreak + 1 : 0
  unknownStreak = role === 'unknown' ? unknownStreak + 1 : 0

  if (role === 'unknown') {
    if (unknownStreak >= UNKNOWN_ATTEMPTS && !rolePublished) {
      publishRole(siteId, url, 'unknown')
    }
    return
  }

  if (nonPlayer && nonPlayerStreak < NON_PLAYER_CONFIRMATIONS) {
    return
  }

  const ownGameEnded =
    role === 'spectating' && (roleValue === 'playing' || roleValue === 'finished')
  const resolved = ownGameEnded ? 'finished' : role

  if (resolved !== roleValue || !rolePublished) {
    publishRole(siteId, url, resolved)
  }
}

function trackPresence(url: string): void {
  const { activeSite } = getSettings()

  if (!isSiteURL(activeSite, url)) {
    stopRolePolling()
    return
  }

  setLastSiteUrl(activeSite, url)

  if (!needsGameRole(activeSite, url)) {
    stopRolePolling()
    updatePlayingState(isPlayingGame(activeSite, url))
    updatePresenceLocation(activeSite, url)
    return
  }

  if (roleUrl === url) {
    return
  }

  stopRolePolling()
  roleUrl = url

  roleTimer = setInterval(() => {
    void refreshGameRole(activeSite, url)
  }, ROLE_POLL_INTERVAL)
  roleTimer.unref()

  void refreshGameRole(activeSite, url)
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

function openExternally(url: string): void {
  if (!isOpenableExternally(url)) {
    console.warn('Blocked external URL with unsupported protocol:', url)
    return
  }

  shell.openExternal(url).catch((error) => {
    console.error('Failed to open external URL:', error)
  })
}

export function hardenWebviewAttachment(host: WebContents): void {
  host.on('will-attach-webview', (_event, webPreferences, params) => {
    webPreferences.preload = join(__dirname, '../preload/webview.js')
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true

    if (typeof params.src !== 'string' || !isActiveSiteURL(params.src)) {
      params.src = SITES[getSettings().activeSite].startUrl
    }
  })
}

function configure(contents: WebContents, getWindow: () => BrowserWindow | null): void {
  siteContents = contents
  contents.setUserAgent(browserUserAgent())
  contents.setAudioMuted(getSettings().soundMuted)

  contents.setWindowOpenHandler(({ url }) => {
    if (isActiveSiteURL(url)) {
      contents.loadURL(url)
    } else {
      openExternally(url)
    }
    return { action: 'deny' }
  })

  contents.on('will-navigate', (event, url) => {
    if (!isActiveSiteURL(url)) {
      event.preventDefault()
      openExternally(url)
    }
  })

  contents.on('dom-ready', () => {
    const settings = getSettings()

    contents.setZoomFactor(toZoomFactor(settings.zoom[settings.activeSite]))
    applyVolume(contents, settings.volume)
    rejectCookieBanners(contents)
    trackPresence(contents.getURL())
  })

  contents.on('did-navigate', (_event, url) => {
    trackPresence(url)
  })

  contents.on('did-navigate-in-page', (_event, url, isMainFrame) => {
    if (isMainFrame) {
      trackPresence(url)
    }
  })

  contents.on('did-start-loading', () => {
    getWindow()?.webContents.send(IPC.webview.loadStart)
  })

  contents.on('did-stop-loading', () => {
    getWindow()?.webContents.send(IPC.webview.loadStop)
  })

  contents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === ABORTED_BY_USER) {
      return
    }

    const payload: WebviewLoadError = { errorCode, errorDescription, validatedURL }
    getWindow()?.webContents.send(IPC.webview.loadError, payload)
  })

  contents.on('destroyed', () => {
    if (siteContents === contents) {
      siteContents = null
      stopRolePolling()
    }
  })
}

export function registerWebviewHandling(getWindow: () => BrowserWindow | null): void {
  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() === 'webview') {
      configure(contents, getWindow)
    }
  })
}
