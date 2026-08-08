import { app, type BrowserWindow, type Input, ipcMain } from 'electron'
import { IPC } from '../shared/ipc-channels'
import {
  resolveShortcutChords,
  SHORTCUTS,
  type ShortcutAction,
  shortcutChordMatchesBinding
} from '../shared/shortcuts'
import { getSettings } from './store'

let recordingContentsId: number | null = null

function matchCommand(input: Input): ShortcutAction | null {
  if (input.type !== 'keyDown' || input.isAutoRepeat || input.meta) {
    return null
  }

  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key
  const binding = {
    key,
    control: input.control,
    alt: input.alt,
    shift: input.shift
  }
  const { shortcutOverrides } = getSettings()

  const shortcut = SHORTCUTS.find((candidate) =>
    resolveShortcutChords(candidate, shortcutOverrides).some((chord) =>
      shortcutChordMatchesBinding(chord, binding)
    )
  )

  return shortcut?.command ?? null
}

export function registerShortcuts(getWindow: () => BrowserWindow | null): void {
  ipcMain.on(IPC.shortcuts.recording, (event, recording: unknown) => {
    if (event.sender !== getWindow()?.webContents) {
      return
    }

    recordingContentsId = recording === true ? event.sender.id : null
  })

  app.on('web-contents-created', (_event, contents) => {
    const type = contents.getType()

    if (type !== 'window' && type !== 'webview') {
      return
    }

    const clearRecording = (): void => {
      if (contents.id === recordingContentsId) {
        recordingContentsId = null
      }
    }

    contents.on('did-start-loading', clearRecording)
    contents.on('destroyed', clearRecording)

    contents.on('before-input-event', (event, input) => {
      if (contents.id === recordingContentsId) {
        return
      }

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
