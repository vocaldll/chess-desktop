import { app, BrowserWindow, Menu } from 'electron'
import { registerContextMenus } from './context-menu'
import { registerIpc } from './ipc'
import { registerPermissions } from './permissions'
import { applySettings } from './settings-effects'
import { registerShortcuts } from './shortcuts'
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

app.setName(app.isPackaged ? 'Chess Desktop' : 'Chess Desktop Dev')

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.setAppUserModelId('app.chessdesktop.client')
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
  registerShortcuts(getWindow)
  registerContextMenus(getWindow)
  registerIpc(getWindow)

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    registerPermissions()
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
