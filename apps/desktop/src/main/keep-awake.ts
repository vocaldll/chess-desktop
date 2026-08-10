import { powerSaveBlocker } from 'electron'

let playing = false
let blockerId: number | null = null

function sync(): void {
  if (playing && blockerId === null) {
    blockerId = powerSaveBlocker.start('prevent-display-sleep')
  } else if (!playing && blockerId !== null) {
    powerSaveBlocker.stop(blockerId)
    blockerId = null
  }
}

export function updatePlayingState(value: boolean): void {
  playing = value
  sync()
}

export function shutdownKeepAwake(): void {
  playing = false
  sync()
}
