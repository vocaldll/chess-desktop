import { join } from 'node:path'
import { app, type BrowserWindow, shell, type WebContents } from 'electron'
import { CHESS_START_URL, isChessURL, isOpenableExternally } from '../shared/chess'
import { IPC, type WebviewLoadError } from '../shared/ipc-channels'
import { getSettings } from './store'

const ABORTED_BY_USER = -3

let chessContents: WebContents | null = null

export function getChessWebContents(): WebContents | null {
  return chessContents && !chessContents.isDestroyed() ? chessContents : null
}

export function registerAppCommands(window: BrowserWindow): void {
  window.on('app-command', (_event, command) => {
    const history = getChessWebContents()?.navigationHistory

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

    if (typeof params.src !== 'string' || !isChessURL(params.src)) {
      params.src = CHESS_START_URL
    }
  })
}

function configure(contents: WebContents, getWindow: () => BrowserWindow | null): void {
  chessContents = contents
  contents.setUserAgent(browserUserAgent())
  contents.setAudioMuted(getSettings().soundMuted)

  contents.setWindowOpenHandler(({ url }) => {
    if (isChessURL(url)) {
      contents.loadURL(url)
    } else {
      openExternally(url)
    }
    return { action: 'deny' }
  })

  contents.on('will-navigate', (event, url) => {
    if (!isChessURL(url)) {
      event.preventDefault()
      openExternally(url)
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
    if (chessContents === contents) {
      chessContents = null
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
