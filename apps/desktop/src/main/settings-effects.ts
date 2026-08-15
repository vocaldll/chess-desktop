import type { BrowserWindow } from 'electron'
import type { SettingKey, Settings } from '../shared/settings'
import { toZoomFactor } from '../shared/zoom'
import { applyVolume } from './audio'
import { applyChatVisibility } from './chat-visibility'
import { applyPresenceSettings } from './discord'
import { applyReviewOnLichess } from './lichess-review'
import { applyNumberedArrows } from './numbered-arrows'
import { applyPlayerAnonymity } from './player-anonymity'
import { activateSite, getSiteWebContents } from './webview'

export function applySettings(window: BrowserWindow | null, settings: Settings): void {
  window?.setAlwaysOnTop(settings.alwaysOnTop)

  const contents = getSiteWebContents()
  contents?.setAudioMuted(settings.soundMuted)
  contents?.setZoomFactor(toZoomFactor(settings.zoom[settings.activeSite]))
  applyVolume(contents, settings.volume)
  applyChatVisibility(contents, settings.activeSite, settings.hideChat)
  applyPlayerAnonymity(contents, settings.activeSite, settings.hideOpponent, settings.hideRatings)
  applyNumberedArrows(contents, settings.activeSite, settings.numberedArrows)
  applyReviewOnLichess(contents, settings.activeSite, settings.reviewOnLichess)
  applyPresenceSettings(settings)
}

export function applySetting(
  window: BrowserWindow | null,
  settings: Settings,
  key: SettingKey,
): void {
  const contents = getSiteWebContents()

  switch (key) {
    case 'alwaysOnTop':
      window?.setAlwaysOnTop(settings.alwaysOnTop)
      return
    case 'soundMuted':
      contents?.setAudioMuted(settings.soundMuted)
      return
    case 'volume':
      applyVolume(contents, settings.volume)
      return
    case 'zoom':
      contents?.setZoomFactor(toZoomFactor(settings.zoom[settings.activeSite]))
      return
    case 'hideChat':
      applyChatVisibility(contents, settings.activeSite, settings.hideChat)
      return
    case 'hideOpponent':
    case 'hideRatings':
      applyPlayerAnonymity(
        contents,
        settings.activeSite,
        settings.hideOpponent,
        settings.hideRatings,
      )
      return
    case 'numberedArrows':
      applyNumberedArrows(contents, settings.activeSite, settings.numberedArrows)
      return
    case 'reviewOnLichess':
      applyReviewOnLichess(contents, settings.activeSite, settings.reviewOnLichess)
      return
    case 'activeSite':
      activateSite(window)
      applyPresenceSettings(settings)
      return
    case 'discordRpcEnabled':
      applyPresenceSettings(settings)
      return
    case 'notificationsEnabled':
    case 'anonymousErrorReporting':
    case 'onboardingCompleted':
    case 'shortcutOverrides':
      return
    default: {
      const unhandled: never = key
      throw new Error(`Unhandled setting effect: ${unhandled}`)
    }
  }
}
