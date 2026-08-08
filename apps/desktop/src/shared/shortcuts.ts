export type ShortcutCommand =
  | 'focus-address'
  | 'reload'
  | 'back'
  | 'forward'
  | 'toggle-always-on-top'
  | 'toggle-mute'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-reset'

export type ShortcutAction = ShortcutCommand | 'fullscreen' | 'exit-fullscreen'

export interface ShortcutBinding {
  key: string
  control: boolean
  alt: boolean
  shift: boolean
}

export type ShortcutOverrides = Partial<Record<ShortcutAction, ShortcutBinding | null>>

export interface ShortcutChord {
  keys: readonly string[]
  control: boolean
  alt: boolean
  shift?: boolean
  label: string
}

export interface Shortcut {
  command: ShortcutAction
  description: string
  chords: readonly ShortcutChord[]
  customizable?: boolean
}

const MODIFIER_KEYS = new Set(['alt', 'altgraph', 'control', 'meta', 'shift'])

export function normalizeShortcutKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key
}

export function formatShortcutBinding(binding: ShortcutBinding): string {
  const labels: string[] = []

  if (binding.control) {
    labels.push('Ctrl')
  }
  if (binding.alt) {
    labels.push('Alt')
  }
  if (binding.shift) {
    labels.push('Shift')
  }

  const keyLabels: Record<string, string> = {
    ' ': 'Space',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    Escape: 'Esc'
  }
  const key =
    keyLabels[binding.key] ?? (binding.key.length === 1 ? binding.key.toUpperCase() : binding.key)

  return [...labels, key].join('+')
}

export function isShortcutBinding(value: unknown): value is ShortcutBinding {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const binding = value as Record<string, unknown>
  return (
    typeof binding.key === 'string' &&
    binding.key.length > 0 &&
    binding.key.length <= 32 &&
    !MODIFIER_KEYS.has(binding.key.toLowerCase()) &&
    typeof binding.control === 'boolean' &&
    typeof binding.alt === 'boolean' &&
    typeof binding.shift === 'boolean'
  )
}

export function isShortcutOverrides(value: unknown): value is ShortcutOverrides {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const customizable = new Set(
    SHORTCUTS.filter((shortcut) => shortcut.customizable !== false).map(
      (shortcut) => shortcut.command
    )
  )

  return Object.entries(value).every(
    ([command, binding]) =>
      customizable.has(command as ShortcutAction) &&
      (binding === null || isShortcutBinding(binding))
  )
}

export function coerceShortcutOverrides(value: unknown): ShortcutOverrides {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }

  const customizable = new Set(
    SHORTCUTS.filter((shortcut) => shortcut.customizable !== false).map(
      (shortcut) => shortcut.command
    )
  )
  const result: ShortcutOverrides = {}
  for (const [command, binding] of Object.entries(value)) {
    if (
      !customizable.has(command as ShortcutAction) ||
      (binding !== null && !isShortcutBinding(binding))
    ) {
      continue
    }

    result[command as ShortcutAction] = binding
      ? {
          key: normalizeShortcutKey(binding.key),
          control: binding.control,
          alt: binding.alt,
          shift: binding.shift
        }
      : null
  }
  return result
}

export function isShortcutCustomized(
  command: ShortcutAction,
  overrides: ShortcutOverrides
): boolean {
  return Object.hasOwn(overrides, command)
}

export function resolveShortcutChords(
  shortcut: Shortcut,
  overrides: ShortcutOverrides
): readonly ShortcutChord[] {
  if (!isShortcutCustomized(shortcut.command, overrides)) {
    return shortcut.chords
  }

  const binding = overrides[shortcut.command]
  if (!binding) {
    return []
  }

  return [
    {
      keys: [binding.key],
      control: binding.control,
      alt: binding.alt,
      shift: binding.shift,
      label: formatShortcutBinding(binding)
    }
  ]
}

export function shortcutChordMatchesBinding(
  chord: ShortcutChord,
  binding: ShortcutBinding
): boolean {
  return (
    chord.keys.includes(normalizeShortcutKey(binding.key)) &&
    chord.control === binding.control &&
    chord.alt === binding.alt &&
    (chord.shift === undefined || chord.shift === binding.shift)
  )
}

export const SHORTCUTS: readonly Shortcut[] = [
  {
    command: 'focus-address',
    description: 'Focus the address bar',
    chords: [{ keys: ['l'], control: true, alt: false, shift: false, label: 'Ctrl+L' }]
  },
  {
    command: 'reload',
    description: 'Reload the page',
    chords: [
      { keys: ['r'], control: true, alt: false, shift: false, label: 'Ctrl+R' },
      { keys: ['F5'], control: false, alt: false, shift: false, label: 'F5' }
    ]
  },
  {
    command: 'back',
    description: 'Go back',
    chords: [{ keys: ['ArrowLeft'], control: false, alt: true, shift: false, label: 'Alt+←' }]
  },
  {
    command: 'forward',
    description: 'Go forward',
    chords: [{ keys: ['ArrowRight'], control: false, alt: true, shift: false, label: 'Alt+→' }]
  },
  {
    command: 'toggle-always-on-top',
    description: 'Toggle always on top',
    chords: [{ keys: ['p'], control: true, alt: true, shift: false, label: 'Ctrl+Alt+P' }]
  },
  {
    command: 'toggle-mute',
    description: 'Toggle sound',
    chords: [{ keys: ['m'], control: true, alt: false, shift: false, label: 'Ctrl+M' }]
  },
  {
    command: 'zoom-in',
    description: 'Zoom in',
    chords: [{ keys: ['+', '='], control: true, alt: false, label: 'Ctrl++' }]
  },
  {
    command: 'zoom-out',
    description: 'Zoom out',
    chords: [{ keys: ['-', '_'], control: true, alt: false, label: 'Ctrl+-' }]
  },
  {
    command: 'zoom-reset',
    description: 'Reset zoom',
    chords: [{ keys: ['0'], control: true, alt: false, shift: false, label: 'Ctrl+0' }]
  },
  {
    command: 'fullscreen',
    description: 'Toggle full screen',
    chords: [{ keys: ['F11'], control: false, alt: false, shift: false, label: 'F11' }]
  },
  {
    command: 'exit-fullscreen',
    description: 'Exit full screen',
    chords: [{ keys: ['Escape'], control: false, alt: false, shift: false, label: 'Esc' }],
    customizable: false
  }
]
