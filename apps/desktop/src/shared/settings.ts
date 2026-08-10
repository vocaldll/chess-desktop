import { coerceShortcutOverrides, isShortcutOverrides, type ShortcutOverrides } from './shortcuts'
import { DEFAULT_SITE, isSiteId, type SiteId } from './sites'
import { DEFAULT_VOLUME, isVolumePercent } from './volume'
import { coerceSiteZoom, isSiteZoom, type SiteZoom } from './zoom'

export interface Settings {
  activeSite: SiteId
  soundMuted: boolean
  volume: number
  alwaysOnTop: boolean
  hideChat: boolean
  hideOpponent: boolean
  hideRatings: boolean
  numberedArrows: boolean
  reviewOnLichess: boolean
  notificationsEnabled: boolean
  discordRpcEnabled: boolean
  onboardingCompleted: boolean
  shortcutOverrides: ShortcutOverrides
  zoom: SiteZoom
}

export const defaultSettings: Settings = {
  activeSite: DEFAULT_SITE,
  soundMuted: false,
  volume: DEFAULT_VOLUME,
  alwaysOnTop: false,
  hideChat: false,
  hideOpponent: false,
  hideRatings: false,
  numberedArrows: false,
  reviewOnLichess: true,
  notificationsEnabled: true,
  discordRpcEnabled: false,
  onboardingCompleted: false,
  shortcutOverrides: {},
  zoom: coerceSiteZoom(null)
}

export type SettingKey = keyof Settings

export function isSettingKey(key: unknown): key is SettingKey {
  return typeof key === 'string' && Object.hasOwn(defaultSettings, key)
}

export function isValidSettingValue<K extends SettingKey>(
  key: K,
  value: unknown
): value is Settings[K] {
  if (key === 'activeSite') {
    return isSiteId(value)
  }

  if (key === 'zoom') {
    return isSiteZoom(value)
  }

  if (key === 'volume') {
    return isVolumePercent(value)
  }

  if (key === 'shortcutOverrides') {
    return isShortcutOverrides(value)
  }

  return typeof value === typeof defaultSettings[key]
}

export function coerceSettings(raw: unknown): Settings {
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const result = { ...defaultSettings }

  for (const key of Object.keys(defaultSettings) as SettingKey[]) {
    const value = source[key]
    if (isValidSettingValue(key, value)) {
      result[key] = value as never
    }
  }

  result.zoom = coerceSiteZoom(source.zoom)
  result.shortcutOverrides = coerceShortcutOverrides(source.shortcutOverrides)

  return result
}
