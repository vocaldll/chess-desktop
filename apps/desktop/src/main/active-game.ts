import type { BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc-channels'

let playing = false

export function isActiveGame(): boolean {
  return playing
}

export function updateActiveGameState(window: BrowserWindow | null, value: boolean): void {
  if (playing === value) {
    return
  }

  playing = value
  window?.webContents.send(IPC.activeGame.playingChanged, value)
}
