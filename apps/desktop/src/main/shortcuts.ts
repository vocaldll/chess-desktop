import { app, type BrowserWindow, type Input } from 'electron'
import { IPC, type ShortcutCommand } from '../shared/ipc-channels'

type Command = ShortcutCommand | 'fullscreen' | 'exit-fullscreen'

interface Binding {
  key: string
  control: boolean
  alt: boolean
  command: Command
}

const BINDINGS: readonly Binding[] = [
  { key: 'l', control: true, alt: false, command: 'focus-address' },
  { key: 'r', control: true, alt: false, command: 'reload' },
  { key: 'F5', control: false, alt: false, command: 'reload' },
  { key: 'ArrowLeft', control: false, alt: true, command: 'back' },
  { key: 'ArrowRight', control: false, alt: true, command: 'forward' },
  { key: 'm', control: true, alt: false, command: 'toggle-mute' },
  { key: 'F11', control: false, alt: false, command: 'fullscreen' },
  { key: 'Escape', control: false, alt: false, command: 'exit-fullscreen' }
]

function matchCommand(input: Input): Command | null {
  if (input.type !== 'keyDown' || input.isAutoRepeat || input.shift || input.meta) {
    return null
  }

  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key

  const binding = BINDINGS.find(
    (candidate) =>
      candidate.key === key && candidate.control === input.control && candidate.alt === input.alt
  )

  return binding?.command ?? null
}

export function registerShortcuts(getWindow: () => BrowserWindow | null): void {
  app.on('web-contents-created', (_event, contents) => {
    const type = contents.getType()

    if (type !== 'window' && type !== 'webview') {
      return
    }

    contents.on('before-input-event', (event, input) => {
      const command = matchCommand(input)
      const window = getWindow()

      if (!command || !window) {
        return
      }

      if (command === 'exit-fullscreen' && !window.isFullScreen()) {
        return
      }

      event.preventDefault()

      if (command === 'fullscreen') {
        window.setFullScreen(!window.isFullScreen())
      } else if (command === 'exit-fullscreen') {
        window.setFullScreen(false)
      } else {
        window.webContents.send(IPC.shortcuts.triggered, command)
      }
    })
  })
}
