import { DEFAULT_SITE, isSiteId, type SiteId } from './sites'
import { coerceSiteZoom, isSiteZoom, type SiteZoom } from './zoom'

export interface Settings {
  activeSite: SiteId
  soundMuted: boolean
  alwaysOnTop: boolean
  notificationsEnabled: boolean
  discordRpcEnabled: boolean
  onboardingCompleted: boolean
  zoom: SiteZoom
}

export const defaultSettings: Settings = {
  activeSite: DEFAULT_SITE,
  soundMuted: false,
  alwaysOnTop: false,
  notificationsEnabled: true,
  discordRpcEnabled: false,
  onboardingCompleted: false,
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

  return result
}
