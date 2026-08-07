import { app, type BrowserWindow, type Input } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { SHORTCUTS, type ShortcutAction } from '../shared/shortcuts'

function matchCommand(input: Input): ShortcutAction | null {
  if (input.type !== 'keyDown' || input.isAutoRepeat || input.shift || input.meta) {
    return null
  }

  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key

  const shortcut = SHORTCUTS.find((candidate) =>
    candidate.chords.some(
      (chord) => chord.key === key && chord.control === input.control && chord.alt === input.alt
    )
  )

  return shortcut?.command ?? null
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
