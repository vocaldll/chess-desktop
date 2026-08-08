import { ipcMain, shell } from 'electron'
import { IPC } from '../../shared/ipc-channels'

const REPOSITORY_URL = 'https://github.com/vocaldll/chess-desktop'

export function registerLinksIpc(): void {
  ipcMain.on(IPC.links.openRepository, () => {
    shell.openExternal(REPOSITORY_URL).catch((error) => {
      console.error('Failed to open repository URL:', error)
    })
  })
}
