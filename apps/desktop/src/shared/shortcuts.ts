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

export interface ShortcutChord {
  keys: readonly string[]
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
    chords: [{ keys: ['l'], control: true, alt: false, label: 'Ctrl+L' }]
  },
  {
    command: 'reload',
    description: 'Reload the page',
    chords: [
      { keys: ['r'], control: true, alt: false, label: 'Ctrl+R' },
      { keys: ['F5'], control: false, alt: false, label: 'F5' }
    ]
  },
  {
    command: 'back',
    description: 'Go back',
    chords: [{ keys: ['ArrowLeft'], control: false, alt: true, label: 'Alt+←' }]
  },
  {
    command: 'forward',
    description: 'Go forward',
    chords: [{ keys: ['ArrowRight'], control: false, alt: true, label: 'Alt+→' }]
  },
  {
    command: 'toggle-always-on-top',
    description: 'Toggle always on top',
    chords: [{ keys: ['p'], control: true, alt: true, label: 'Ctrl+Alt+P' }]
  },
  {
    command: 'toggle-mute',
    description: 'Mute or unmute sound',
    chords: [{ keys: ['m'], control: true, alt: false, label: 'Ctrl+M' }]
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
    chords: [{ keys: ['0'], control: true, alt: false, label: 'Ctrl+0' }]
  },
  {
    command: 'fullscreen',
    description: 'Toggle full screen',
    chords: [{ keys: ['F11'], control: false, alt: false, label: 'F11' }]
  },
  {
    command: 'exit-fullscreen',
    description: 'Exit full screen',
    chords: [{ keys: ['Escape'], control: false, alt: false, label: 'Esc' }]
  }
]
