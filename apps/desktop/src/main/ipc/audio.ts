import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { applyVolume } from '../audio'
import { getSiteWebContents } from '../webview'

export function registerAudioIpc(): void {
  ipcMain.on(IPC.audio.setVolume, (_event, percent: unknown) => {
    applyVolume(getSiteWebContents(), percent)
  })
}
