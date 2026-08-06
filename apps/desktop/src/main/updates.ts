import { app, type BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IPC } from '../shared/ipc-channels'

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

  autoUpdater.on('update-downloaded', (info) => {
    getWindow()?.webContents.send(IPC.updates.downloaded, info.version)
  })

  autoUpdater.checkForUpdates().catch(() => null)
}
