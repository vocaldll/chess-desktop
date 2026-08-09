import { describe, expect, it } from 'vitest'
import {
  coerceShortcutOverrides,
  formatShortcutBinding,
  isShortcutBinding,
  isShortcutCustomized,
  isShortcutOverrides,
  normalizeShortcutKey,
  resolveShortcutChords,
  SHORTCUTS,
  type ShortcutBinding,
  shortcutChordMatchesBinding
} from './shortcuts'

const binding = (overrides: Partial<ShortcutBinding> = {}): ShortcutBinding => ({
  key: 'k',
  control: true,
  alt: false,
  shift: false,
  ...overrides
})

describe('shortcut binding validation', () => {
  it('normalizes single-character keys only', () => {
    expect(normalizeShortcutKey('K')).toBe('k')
    expect(normalizeShortcutKey('F11')).toBe('F11')
    expect(normalizeShortcutKey('ArrowLeft')).toBe('ArrowLeft')
  })

  it.each([
    binding(),
    binding({ key: 'F12', control: false }),
    binding({ key: 'ArrowLeft', alt: true })
  ])('accepts valid binding %j', (value) => {
    expect(isShortcutBinding(value)).toBe(true)
  })

  it.each([
    null,
    [],
    {},
    binding({ key: '' }),
    binding({ key: 'x'.repeat(33) }),
    binding({ key: 'Shift' }),
    { ...binding(), control: 1 }
  ])('rejects invalid binding %j', (value) => {
    expect(isShortcutBinding(value)).toBe(false)
  })
})

describe('shortcut formatting', () => {
  it.each([
    [binding({ key: 'k' }), 'Ctrl+K'],
    [binding({ key: ' ', control: false }), 'Space'],
    [binding({ key: 'Escape', control: false }), 'Esc'],
    [binding({ key: 'ArrowLeft', control: false, alt: true }), 'Alt+←'],
    [binding({ key: 'F8', control: true, alt: true, shift: true }), 'Ctrl+Alt+Shift+F8']
  ] as const)('formats a binding as %s', (value, expected) => {
    expect(formatShortcutBinding(value)).toBe(expected)
  })
})

describe('shortcut overrides', () => {
  it('accepts valid customizable overrides and disabled shortcuts', () => {
    expect(isShortcutOverrides({ reload: binding(), back: null })).toBe(true)
  })

  it.each([
    null,
    [],
    { unknown: binding() },
    { reload: binding({ key: 'Control' }) },
    { 'exit-fullscreen': binding({ key: 'F10' }) }
  ])('rejects invalid overrides %j', (value) => {
    expect(isShortcutOverrides(value)).toBe(false)
  })

  it('keeps valid entries, normalizes keys, and drops invalid entries', () => {
    expect(
      coerceShortcutOverrides({
        reload: binding({ key: 'R', shift: true }),
        back: null,
        unknown: binding(),
        fullscreen: binding({ key: 'Meta' })
      })
    ).toEqual({
      reload: binding({ key: 'r', shift: true }),
      back: null
    })
  })

  it.each([null, [], 'invalid'])('coerces %j to an empty object', (value) => {
    expect(coerceShortcutOverrides(value)).toEqual({})
  })
})

describe('shortcut resolution', () => {
  const reload = SHORTCUTS.find((shortcut) => shortcut.command === 'reload')
  const zoomIn = SHORTCUTS.find((shortcut) => shortcut.command === 'zoom-in')

  if (!reload || !zoomIn) {
    throw new Error('Expected default shortcuts are missing')
  }

  it('returns default chords without an override', () => {
    expect(resolveShortcutChords(reload, {})).toBe(reload.chords)
    expect(isShortcutCustomized('reload', {})).toBe(false)
  })

  it('returns no chords for a disabled shortcut', () => {
    expect(resolveShortcutChords(reload, { reload: null })).toEqual([])
    expect(isShortcutCustomized('reload', { reload: null })).toBe(true)
  })

  it('turns a custom binding into a labeled chord', () => {
    expect(
      resolveShortcutChords(reload, { reload: binding({ key: 'F8', control: false }) })
    ).toEqual([
      {
        keys: ['F8'],
        control: false,
        alt: false,
        shift: false,
        label: 'F8'
      }
    ])
  })

  it('matches key alternatives and optional shift state', () => {
    const chord = zoomIn.chords[0]

    expect(shortcutChordMatchesBinding(chord, binding({ key: '=', shift: true }))).toBe(true)
    expect(shortcutChordMatchesBinding(chord, binding({ key: '+', shift: false }))).toBe(true)
    expect(shortcutChordMatchesBinding(chord, binding({ key: '-', shift: false }))).toBe(false)
    expect(shortcutChordMatchesBinding(chord, binding({ key: '+', alt: true }))).toBe(false)
  })
})
