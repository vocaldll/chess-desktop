import type { BrowserWindow } from 'electron'
import { registerSettingsIpc } from './settings'
import { registerWindowIpc } from './window'

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  registerWindowIpc(getWindow)
  registerSettingsIpc(getWindow)
}
