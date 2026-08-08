export const IPC = {
  window: {
    minimize: 'window:minimize',
    toggleMaximize: 'window:toggle-maximize',
    close: 'window:close',
    isMaximized: 'window:is-maximized',
    maximizeChanged: 'window:maximize-changed',
    fullscreenChanged: 'window:fullscreen-changed'
  },
  shortcuts: {
    triggered: 'shortcuts:triggered',
    recording: 'shortcuts:recording'
  },
  settings: {
    getAll: 'settings:get-all',
    set: 'settings:set'
  },
  audio: {
    setVolume: 'audio:set-volume'
  },
  links: {
    openRepository: 'links:open-repository'
  },
  webview: {
    getLastSiteUrls: 'webview:get-last-site-urls',
    loadStart: 'webview:load-start',
    loadStop: 'webview:load-stop',
    loadError: 'webview:load-error'
  },
  updates: {
    info: 'updates:info',
    check: 'updates:check',
    available: 'updates:available',
    failed: 'updates:failed',
    downloaded: 'updates:downloaded',
    install: 'updates:install',
    installFailed: 'updates:install-failed'
  }
} as const

export interface WebviewLoadError {
  errorCode: number
  errorDescription: string
  validatedURL: string
}

export interface AppUpdateInfo {
  version: string
  canCheck: boolean
  downloadedVersion: string | null
}

export type AppUpdateCheckResult =
  | { status: 'current' }
  | { status: 'available'; version: string }
  | { status: 'unsupported' }
  | { status: 'error' }
