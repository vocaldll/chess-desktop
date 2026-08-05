import type { BrowserWindow } from 'electron'
import type { Settings } from '../shared/settings'
import { getChessWebContents } from './webview'

export function applySettings(window: BrowserWindow | null, settings: Settings): void {
  window?.setAlwaysOnTop(settings.alwaysOnTop)
  getChessWebContents()?.setAudioMuted(settings.soundMuted)
}
