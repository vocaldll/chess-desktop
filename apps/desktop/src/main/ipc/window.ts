import { type BrowserWindow, ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { isActiveGame } from '../active-game'

export function registerWindowIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.on(IPC.window.minimize, () => {
    getWindow()?.minimize()
  })

  ipcMain.on(IPC.window.toggleMaximize, () => {
    const window = getWindow()
    if (!window) {
      return
    }

    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  ipcMain.on(IPC.window.close, () => {
    getWindow()?.close()
  })

  ipcMain.handle(IPC.window.isMaximized, () => getWindow()?.isMaximized() ?? false)
  ipcMain.handle(IPC.activeGame.isPlaying, () => isActiveGame())
}
