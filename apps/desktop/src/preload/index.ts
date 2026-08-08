import { contextBridge, ipcRenderer } from 'electron'
import {
  type AppUpdateCheckResult,
  type AppUpdateInfo,
  IPC,
  type WebviewLoadError
} from '../shared/ipc-channels'
import type { SettingKey, Settings } from '../shared/settings'
import type { ShortcutCommand } from '../shared/shortcuts'

type Unsubscribe = () => void

function subscribe<T>(channel: string, listener: (payload: T) => void): Unsubscribe {
  const handler = (_event: Electron.IpcRendererEvent, payload: T): void => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}

const api = {
  window: {
    minimize: (): void => ipcRenderer.send(IPC.window.minimize),
    toggleMaximize: (): void => ipcRenderer.send(IPC.window.toggleMaximize),
    close: (): void => ipcRenderer.send(IPC.window.close),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke(IPC.window.isMaximized),
    onMaximizeChange: (listener: (isMaximized: boolean) => void): Unsubscribe =>
      subscribe(IPC.window.maximizeChanged, listener),
    onFullscreenChange: (listener: (isFullscreen: boolean) => void): Unsubscribe =>
      subscribe(IPC.window.fullscreenChanged, listener)
  },
  shortcuts: {
    onCommand: (listener: (command: ShortcutCommand) => void): Unsubscribe =>
      subscribe(IPC.shortcuts.triggered, listener)
  },
  settings: {
    getAll: (): Promise<Settings> => ipcRenderer.invoke(IPC.settings.getAll),
    set: <K extends SettingKey>(key: K, value: Settings[K]): Promise<Settings> =>
      ipcRenderer.invoke(IPC.settings.set, key, value)
  },
  audio: {
    setVolume: (percent: number): void => ipcRenderer.send(IPC.audio.setVolume, percent)
  },
  links: {
    openRepository: (): void => ipcRenderer.send(IPC.links.openRepository)
  },
  webview: {
    onLoadStart: (listener: () => void): Unsubscribe => subscribe(IPC.webview.loadStart, listener),
    onLoadStop: (listener: () => void): Unsubscribe => subscribe(IPC.webview.loadStop, listener),
    onLoadError: (listener: (error: WebviewLoadError) => void): Unsubscribe =>
      subscribe(IPC.webview.loadError, listener)
  },
  updates: {
    getInfo: (): Promise<AppUpdateInfo> => ipcRenderer.invoke(IPC.updates.info),
    check: (): Promise<AppUpdateCheckResult> => ipcRenderer.invoke(IPC.updates.check),
    install: (): void => ipcRenderer.send(IPC.updates.install),
    onAvailable: (listener: (version: string) => void): Unsubscribe =>
      subscribe(IPC.updates.available, listener),
    onFailed: (listener: () => void): Unsubscribe => subscribe(IPC.updates.failed, listener),
    onDownloaded: (listener: (version: string) => void): Unsubscribe =>
      subscribe(IPC.updates.downloaded, listener),
    onInstallFailed: (listener: () => void): Unsubscribe =>
      subscribe(IPC.updates.installFailed, listener)
  }
}

export type DesktopApi = typeof api

contextBridge.exposeInMainWorld('api', api)
