import { app, BrowserWindow } from 'electron'
import { registerIpc } from './ipc'
import { applySettings } from './settings-effects'
import { getSettings } from './store'
import { startAutoUpdates } from './updates'
import {
  browserUserAgent,
  hardenWebviewAttachment,
  registerAppCommands,
  registerWebviewHandling
} from './webview'
import { createMainWindow } from './window'

let mainWindow: BrowserWindow | null = null

const getWindow = (): BrowserWindow | null =>
  mainWindow && !mainWindow.isDestroyed() ? mainWindow : null

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.setAppUserModelId('app.chessdesktop')
  app.userAgentFallback = browserUserAgent()

  app.on('second-instance', () => {
    const window = getWindow()
    if (!window) {
      return
    }

    if (window.isMinimized()) {
      window.restore()
    }
    window.focus()
  })

  registerWebviewHandling(getWindow)
  registerIpc(getWindow)

  app.whenReady().then(() => {
    createWindow()
    startAutoUpdates(getWindow)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    app.quit()
  })
}

function createWindow(): void {
  mainWindow = createMainWindow()
  hardenWebviewAttachment(mainWindow.webContents)
  registerAppCommands(mainWindow)
  applySettings(mainWindow, getSettings())

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}
