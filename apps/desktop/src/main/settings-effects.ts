import type { BrowserWindow } from 'electron'
import type { Settings } from '../shared/settings'
import { toZoomFactor } from '../shared/zoom'
import { applyVolume } from './audio'
import { applyChatVisibility } from './chat-visibility'
import { applyPresenceSettings } from './discord'
import { applyReviewOnLichess } from './lichess-review'
import { applyPlayerAnonymity } from './player-anonymity'
import { getSiteWebContents } from './webview'

export function applySettings(window: BrowserWindow | null, settings: Settings): void {
  window?.setAlwaysOnTop(settings.alwaysOnTop)

  const contents = getSiteWebContents()
  contents?.setAudioMuted(settings.soundMuted)
  contents?.setZoomFactor(toZoomFactor(settings.zoom[settings.activeSite]))
  applyVolume(contents, settings.volume)
  applyChatVisibility(contents, settings.activeSite, settings.hideChat)
  applyPlayerAnonymity(contents, settings.activeSite, settings.hideOpponent, settings.hideRatings)
  applyReviewOnLichess(contents, settings.activeSite, settings.reviewOnLichess)
  applyPresenceSettings(settings)
}
