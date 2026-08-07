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

  ipcMain.on(IPC.updates.install, () => {
    autoUpdater.quitAndInstall(true, true)
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
