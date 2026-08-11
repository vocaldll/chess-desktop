import { type BrowserWindow, ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { isSettingKey, isValidSettingValue } from '../../shared/settings'
import { setErrorReportingEnabled } from '../error-reporting'
import { applySetting } from '../settings-effects'
import { getSettings, setSetting } from '../store'

export function registerSettingsIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC.settings.getAll, () => getSettings())

  ipcMain.handle(IPC.settings.set, (_event, key: unknown, value: unknown) => {
    if (!isSettingKey(key)) {
      throw new Error(`Unknown setting: ${String(key)}`)
    }

    if (!isValidSettingValue(key, value)) {
      throw new Error(`Invalid value for setting: ${key}`)
    }

    const settings = setSetting(key, value as never)
    if (key === 'anonymousErrorReporting') {
      setErrorReportingEnabled(settings.anonymousErrorReporting)
    }
    applySetting(getWindow(), settings, key)
    return settings
  })
}
