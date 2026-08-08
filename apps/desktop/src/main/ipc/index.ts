import type { BrowserWindow } from 'electron'
import { registerAudioIpc } from './audio'
import { registerLinksIpc } from './links'
import { registerSettingsIpc } from './settings'
import { registerWebviewIpc } from './webview'
import { registerWindowIpc } from './window'

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  registerWindowIpc(getWindow)
  registerSettingsIpc(getWindow)
  registerWebviewIpc()
  registerAudioIpc()
  registerLinksIpc()
}
