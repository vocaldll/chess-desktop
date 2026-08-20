import { describe, expect, it } from 'vitest'
import {
  coerceShortcutOverrides,
  formatShortcutBinding,
  isShortcutBinding,
  isShortcutCustomized,
  isShortcutOverrides,
  normalizeShortcutKey,
  resolveShortcutChord,
  resolveShortcutChords,
  SHORTCUTS,
  type ShortcutBinding,
  shortcutChordMatchesBinding,
} from './shortcuts'

const binding = (overrides: Partial<ShortcutBinding> = {}): ShortcutBinding => ({
  key: 'k',
  control: true,
  alt: false,
  shift: false,
  ...overrides,
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
    binding({ key: 'ArrowLeft', alt: true }),
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
    { ...binding(), control: 1 },
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
    [binding({ key: 'F8', control: true, alt: true, shift: true }), 'Ctrl+Alt+Shift+F8'],
  ] as const)('formats a binding as %s', (value, expected) => {
    expect(formatShortcutBinding(value)).toBe(expected)
  })
})

describe('shortcut overrides', () => {
  it('accepts valid customizable overrides and disabled shortcuts', () => {
    expect(isShortcutOverrides({ reload: { 0: binding() }, back: { 0: null } })).toBe(true)
  })

  it.each([
    null,
    [],
    { unknown: binding() },
    { reload: binding() },
    { reload: {} },
    { reload: { 0: binding({ key: 'Control' }) } },
    { reload: { 2: binding() } },
    { 'exit-fullscreen': { 0: binding({ key: 'F10' }) } },
  ])('rejects invalid overrides %j', (value) => {
    expect(isShortcutOverrides(value)).toBe(false)
  })

  it('keeps valid slots, normalizes keys, and drops invalid entries', () => {
    expect(
      coerceShortcutOverrides({
        reload: {
          0: binding({ key: 'R', shift: true }),
          1: null,
          2: binding(),
        },
        back: { 0: null },
        unknown: binding(),
        fullscreen: { 0: binding({ key: 'Meta' }) },
      }),
    ).toEqual({
      reload: { 0: binding({ key: 'r', shift: true }), 1: null },
      back: { 0: null },
    })
  })

  it('migrates legacy action overrides without changing their behavior', () => {
    expect(
      coerceShortcutOverrides({
        reload: binding({ key: 'F8', control: false }),
        back: null,
      }),
    ).toEqual({
      reload: { 0: binding({ key: 'F8', control: false }), 1: null },
      back: { 0: null },
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
    const overrides = { reload: { 0: null, 1: null } }

    expect(resolveShortcutChords(reload, overrides)).toEqual([])
    expect(isShortcutCustomized('reload', overrides)).toBe(true)
  })

  it('changes one binding without replacing its alternative', () => {
    expect(
      resolveShortcutChords(reload, {
        reload: { 0: binding({ key: 'F8', control: false }) },
      }),
    ).toEqual([
      {
        keys: ['F8'],
        control: false,
        alt: false,
        shift: false,
        label: 'F8',
      },
      reload.chords[1],
    ])
  })

  it('resolves each binding slot independently', () => {
    const overrides = { reload: { 0: null, 1: binding({ key: 'F8', control: false }) } }

    expect(resolveShortcutChord(reload, 0, overrides)).toBeNull()
    expect(resolveShortcutChord(reload, 1, overrides)?.label).toBe('F8')
    expect(resolveShortcutChords(reload, overrides).map((chord) => chord.label)).toEqual(['F8'])
  })

  it('matches key alternatives and optional shift state', () => {
    const chord = zoomIn.chords[0]

    expect(shortcutChordMatchesBinding(chord, binding({ key: '=', shift: true }))).toBe(true)
    expect(shortcutChordMatchesBinding(chord, binding({ key: '+', shift: false }))).toBe(true)
    expect(shortcutChordMatchesBinding(chord, binding({ key: '-', shift: false }))).toBe(false)
    expect(shortcutChordMatchesBinding(chord, binding({ key: '+', alt: true }))).toBe(false)
  })

  it('defines site-switching shortcuts', () => {
    expect(
      SHORTCUTS.filter((shortcut) => shortcut.command.startsWith('switch-')).map((shortcut) => [
        shortcut.command,
        shortcut.chords[0]?.label,
      ]),
    ).toEqual([
      ['switch-chesscom', 'Ctrl+1'],
      ['switch-lichess', 'Ctrl+2'],
    ])
  })
})
