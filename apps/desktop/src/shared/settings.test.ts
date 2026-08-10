import { describe, expect, it } from 'vitest'
import { coerceSettings, defaultSettings, isSettingKey, isValidSettingValue } from './settings'

describe('setting keys and values', () => {
  it('enables Lichess reviews by default', () => {
    expect(defaultSettings.reviewOnLichess).toBe(true)
  })

  it('disables numbered arrows by default', () => {
    expect(defaultSettings.numberedArrows).toBe(false)
  })

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
        reload: { 0: { key: 'r', control: true, alt: false, shift: true } }
      })
    ).toBe(true)
  })

  it('requires booleans for boolean settings', () => {
    expect(isValidSettingValue('soundMuted', true)).toBe(true)
    expect(isValidSettingValue('hideChat', false)).toBe(true)
    expect(isValidSettingValue('hideOpponent', true)).toBe(true)
    expect(isValidSettingValue('hideOpponent', 'yes')).toBe(false)
    expect(isValidSettingValue('hideRatings', true)).toBe(true)
    expect(isValidSettingValue('hideRatings', 'yes')).toBe(false)
    expect(isValidSettingValue('numberedArrows', true)).toBe(true)
    expect(isValidSettingValue('numberedArrows', 'yes')).toBe(false)
    expect(isValidSettingValue('reviewOnLichess', true)).toBe(true)
    expect(isValidSettingValue('reviewOnLichess', 'yes')).toBe(false)
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
      hideChat: true,
      hideOpponent: true,
      hideRatings: true,
      numberedArrows: true,
      reviewOnLichess: false,
      notificationsEnabled: false,
      discordRpcEnabled: true,
      onboardingCompleted: true,
      shortcutOverrides: {
        reload: { 0: { key: 'R', control: true, alt: false, shift: true } },
        back: { 0: null }
      },
      zoom: { chesscom: 75, lichess: 125 }
    }

    expect(coerceSettings(source)).toEqual({
      ...source,
      shortcutOverrides: {
        reload: { 0: { key: 'r', control: true, alt: false, shift: true } },
        back: { 0: null }
      }
    })
  })

  it('drops settings that no longer exist', () => {
    const coerced = coerceSettings({ hideChat: true, keepAwakeWhilePlaying: true })

    expect(coerced).not.toHaveProperty('keepAwakeWhilePlaying')
    expect(coerced.hideChat).toBe(true)
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
          reload: { 0: { key: 'Shift', control: false, alt: false, shift: true } },
          fullscreen: { 0: { key: 'F10', control: false, alt: false, shift: false } }
        }
      })
    ).toEqual({
      ...defaultSettings,
      soundMuted: true,
      zoom: { chesscom: 90, lichess: 100 },
      shortcutOverrides: {
        fullscreen: { 0: { key: 'F10', control: false, alt: false, shift: false } }
      }
    })
  })
})
