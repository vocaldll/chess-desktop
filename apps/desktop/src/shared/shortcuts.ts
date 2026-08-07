export type ShortcutCommand = 'focus-address' | 'reload' | 'back' | 'forward' | 'toggle-mute'

export type ShortcutAction = ShortcutCommand | 'fullscreen' | 'exit-fullscreen'

export interface ShortcutChord {
  key: string
  control: boolean
  alt: boolean
  label: string
}

export interface Shortcut {
  command: ShortcutAction
  description: string
  chords: readonly ShortcutChord[]
}

export const SHORTCUTS: readonly Shortcut[] = [
  {
    command: 'focus-address',
    description: 'Focus the address bar',
    chords: [{ key: 'l', control: true, alt: false, label: 'Ctrl+L' }]
  },
  {
    command: 'reload',
    description: 'Reload the page',
    chords: [
      { key: 'r', control: true, alt: false, label: 'Ctrl+R' },
      { key: 'F5', control: false, alt: false, label: 'F5' }
    ]
  },
  {
    command: 'back',
    description: 'Go back',
    chords: [{ key: 'ArrowLeft', control: false, alt: true, label: 'Alt+←' }]
  },
  {
    command: 'forward',
    description: 'Go forward',
    chords: [{ key: 'ArrowRight', control: false, alt: true, label: 'Alt+→' }]
  },
  {
    command: 'toggle-mute',
    description: 'Mute or unmute sound',
    chords: [{ key: 'm', control: true, alt: false, label: 'Ctrl+M' }]
  },
  {
    command: 'fullscreen',
    description: 'Toggle full screen',
    chords: [{ key: 'F11', control: false, alt: false, label: 'F11' }]
  },
  {
    command: 'exit-fullscreen',
    description: 'Exit full screen',
    chords: [{ key: 'Escape', control: false, alt: false, label: 'Esc' }]
  }
]
