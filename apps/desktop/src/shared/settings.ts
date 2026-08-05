import { DEFAULT_SITE, isSiteId, type SiteId } from './sites'

export interface Settings {
  activeSite: SiteId
  soundMuted: boolean
  alwaysOnTop: boolean
  discordRpcEnabled: boolean
  onboardingCompleted: boolean
}

export const defaultSettings: Settings = {
  activeSite: DEFAULT_SITE,
  soundMuted: false,
  alwaysOnTop: false,
  discordRpcEnabled: false,
  onboardingCompleted: false
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

  return typeof value === typeof defaultSettings[key]
}

export function coerceSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) {
    return { ...defaultSettings }
  }

  const source = raw as Record<string, unknown>
  const result = { ...defaultSettings }

  for (const key of Object.keys(defaultSettings) as SettingKey[]) {
    const value = source[key]
    if (isValidSettingValue(key, value)) {
      result[key] = value as never
    }
  }

  return result
}
