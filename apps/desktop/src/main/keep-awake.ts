import { powerSaveBlocker } from 'electron'
import type { Settings } from '../shared/settings'

let enabled = false
let playing = false
let blockerId: number | null = null

function sync(): void {
  const shouldBlock = enabled && playing

  if (shouldBlock && blockerId === null) {
    blockerId = powerSaveBlocker.start('prevent-display-sleep')
  } else if (!shouldBlock && blockerId !== null) {
    powerSaveBlocker.stop(blockerId)
    blockerId = null
  }
}

export function applyKeepAwakeSettings(settings: Settings): void {
  enabled = settings.keepAwakeWhilePlaying
  sync()
}

export function updatePlayingState(value: boolean): void {
  playing = value
  sync()
}

export function shutdownKeepAwake(): void {
  enabled = false
  playing = false
  sync()
}
