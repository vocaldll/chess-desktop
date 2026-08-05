import { join } from 'node:path'
import { color } from '@chess-desktop/tokens'
import { app, BrowserWindow, type Rectangle, screen } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { getSettings, getWindowBounds, setWindowBounds } from './store'

function developmentIcon(): string | undefined {
  return app.isPackaged ? undefined : join(app.getAppPath(), 'resources', 'icon.ico')
}

function resolveBounds(): Rectangle {
  const saved = getWindowBounds()
  const hasPosition = saved.x !== undefined && saved.y !== undefined

  const area = hasPosition
    ? screen.getDisplayMatching({
        x: saved.x as number,
        y: saved.y as number,
        width: saved.width,
        height: saved.height
      }).workArea
    : screen.getPrimaryDisplay().workArea

  const width = Math.min(saved.width, area.width)
  const height = Math.min(saved.height, area.height)

  const fitsHorizontally =
    saved.x !== undefined && saved.x >= area.x && saved.x + width <= area.x + area.width
  const fitsVertically =
    saved.y !== undefined && saved.y >= area.y && saved.y + height <= area.y + area.height

  return {
    width,
    height,
    x: fitsHorizontally ? (saved.x as number) : area.x + Math.floor((area.width - width) / 2),
    y: fitsVertically ? (saved.y as number) : area.y + Math.floor((area.height - height) / 2)
  }
}

export function createMainWindow(): BrowserWindow {
  const bounds = resolveBounds()
  const wasMaximized = getWindowBounds().isMaximized

  const window = new BrowserWindow({
    ...bounds,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: color.background,
    icon: developmentIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  if (wasMaximized) {
    window.maximize()
  }

  window.setAlwaysOnTop(getSettings().alwaysOnTop)

  window.once('ready-to-show', () => {
    window.show()
  })

  window.on('maximize', () => {
    window.webContents.send(IPC.window.maximizeChanged, true)
  })

  window.on('unmaximize', () => {
    window.webContents.send(IPC.window.maximizeChanged, false)
  })

  window.on('close', () => {
    const isMaximized = window.isMaximized()
    const current = isMaximized ? window.getNormalBounds() : window.getBounds()

    setWindowBounds({
      width: current.width,
      height: current.height,
      x: current.x,
      y: current.y,
      isMaximized
    })
  })

  const devServerURL = process.env.ELECTRON_RENDERER_URL
  if (devServerURL) {
    window.loadURL(devServerURL)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}
