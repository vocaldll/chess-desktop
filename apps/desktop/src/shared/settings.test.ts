import { describe, expect, it } from 'vitest'
import { coerceSettings, defaultSettings, isSettingKey, isValidSettingValue } from './settings'

describe('setting keys and values', () => {
  it.each(Object.keys(defaultSettings))('recognizes %s', (key) => {
    expect(isSettingKey(key)).toBe(true)
  })

  it.each(['', 'unknown', '__proto__', null, 1])('rejects key %j', (key) => {
    expect(isSettingKey(key)).toBe(false)
  })

  it('validates specialized values', () => {
    expect(isValidSettingValue('activeSite', 'lichess')).toBe(true)
    expect(isValidSettingValue('activeSite', 'other')).toBe(false)
    expect(isValidSettingValue('volume', 25)).toBe(true)
    expect(isValidSettingValue('volume', 25.5)).toBe(false)
    expect(isValidSettingValue('zoom', { chesscom: 90, lichess: 110 })).toBe(true)
    expect(isValidSettingValue('zoom', { chesscom: 90 })).toBe(false)
    expect(
      isValidSettingValue('shortcutOverrides', {
        reload: { key: 'r', control: true, alt: false, shift: true }
      })
    ).toBe(true)
  })

  it('requires booleans for boolean settings', () => {
    expect(isValidSettingValue('soundMuted', true)).toBe(true)
    expect(isValidSettingValue('soundMuted', 1)).toBe(false)
    expect(isValidSettingValue('notificationsEnabled', 'false')).toBe(false)
  })
})

describe('settings coercion', () => {
  it.each([null, undefined, 'invalid', []])('returns defaults for %j', (value) => {
    expect(coerceSettings(value)).toEqual(defaultSettings)
  })

  it('preserves valid settings', () => {
    const source = {
      activeSite: 'lichess',
      soundMuted: true,
      volume: 42,
      alwaysOnTop: true,
      keepAwakeWhilePlaying: true,
      notificationsEnabled: false,
      discordRpcEnabled: true,
      onboardingCompleted: true,
      shortcutOverrides: {
        reload: { key: 'R', control: true, alt: false, shift: true },
        back: null
      },
      zoom: { chesscom: 75, lichess: 125 }
    }

    expect(coerceSettings(source)).toEqual({
      ...source,
      shortcutOverrides: {
        reload: { key: 'r', control: true, alt: false, shift: true },
        back: null
      }
    })
  })

  it('defaults invalid fields without discarding valid fields', () => {
    expect(
      coerceSettings({
        activeSite: 'other',
        soundMuted: true,
        volume: -1,
        alwaysOnTop: 'yes',
        zoom: { chesscom: 90, lichess: 123 },
        shortcutOverrides: {
          reload: { key: 'Shift', control: false, alt: false, shift: true },
          fullscreen: { key: 'F10', control: false, alt: false, shift: false }
        }
      })
    ).toEqual({
      ...defaultSettings,
      soundMuted: true,
      zoom: { chesscom: 90, lichess: 100 },
      shortcutOverrides: {
        fullscreen: { key: 'F10', control: false, alt: false, shift: false }
      }
    })
  })
})
