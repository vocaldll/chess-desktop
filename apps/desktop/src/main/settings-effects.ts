import type { BrowserWindow } from 'electron'
import type { Settings } from '../shared/settings'
import { getSiteWebContents } from './webview'

export function applySettings(window: BrowserWindow | null, settings: Settings): void {
  window?.setAlwaysOnTop(settings.alwaysOnTop)
  getSiteWebContents()?.setAudioMuted(settings.soundMuted)
}
