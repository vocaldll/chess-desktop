import { join } from 'node:path'
import { app, type BrowserWindow, shell, type WebContents } from 'electron'
import { IPC, type WebviewLoadError } from '../shared/ipc-channels'
import { isOpenableExternally, isSiteURL, SITES } from '../shared/sites'
import { toZoomFactor } from '../shared/zoom'
import { rejectCookieBanners } from './consent'
import { getSettings } from './store'

const ABORTED_BY_USER = -3

let siteContents: WebContents | null = null

export function getSiteWebContents(): WebContents | null {
  return siteContents && !siteContents.isDestroyed() ? siteContents : null
}

function isActiveSiteURL(url: string): boolean {
  return isSiteURL(getSettings().activeSite, url)
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
    rejectCookieBanners(contents)
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
