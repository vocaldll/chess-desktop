import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { getLastSiteUrls } from '../store'

export function registerWebviewIpc(): void {
  ipcMain.handle(IPC.webview.getLastSiteUrls, () => getLastSiteUrls())
}
