import { app, type BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IPC } from '../shared/ipc-channels'

const CHECK_INTERVAL = 1000 * 60 * 60

export function startAutoUpdates(getWindow: () => BrowserWindow | null): void {
  if (!app.isPackaged) {
    return
  }

  if (process.platform === 'linux' && !process.env.APPIMAGE) {
    return
  }

  let installing = false

  ipcMain.on(IPC.updates.install, () => {
    installing = true
    autoUpdater.quitAndInstall(true, true)
  })

  autoUpdater.on('error', () => {
    if (installing) {
      installing = false
      getWindow()?.webContents.send(IPC.updates.installFailed)
    }
  })

  const check = (): void => {
    autoUpdater.checkForUpdates().catch(() => null)
  }

  const timer = setInterval(check, CHECK_INTERVAL)

  autoUpdater.on('update-downloaded', (info) => {
    clearInterval(timer)
    getWindow()?.webContents.send(IPC.updates.downloaded, info.version)
  })

  app.on('before-quit', () => {
    clearInterval(timer)
  })

  check()
}
