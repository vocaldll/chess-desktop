import type { BrowserWindow } from 'electron'
import type { Settings } from '../shared/settings'
import { toZoomFactor } from '../shared/zoom'
import { applyVolume } from './audio'
import { applyPresenceSettings } from './discord'
import { getSiteWebContents } from './webview'

export function applySettings(window: BrowserWindow | null, settings: Settings): void {
  window?.setAlwaysOnTop(settings.alwaysOnTop)

  const contents = getSiteWebContents()
  contents?.setAudioMuted(settings.soundMuted)
  contents?.setZoomFactor(toZoomFactor(settings.zoom[settings.activeSite]))
  applyVolume(contents, settings.volume)
  applyPresenceSettings(settings)
}
