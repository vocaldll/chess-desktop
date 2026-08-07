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
    triggered: 'shortcuts:triggered'
  },
  settings: {
    getAll: 'settings:get-all',
    set: 'settings:set'
  },
  webview: {
    loadStart: 'webview:load-start',
    loadStop: 'webview:load-stop',
    loadError: 'webview:load-error'
  },
  updates: {
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
