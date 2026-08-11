/// <reference types="vite/client" />

import type { DesktopApi } from '../preload/index'

declare global {
  interface Window {
    api: DesktopApi
  }

  namespace svelteHTML {
    interface IntrinsicElements {
      webview: {
        src?: string
        partition?: string
        allowpopups?: boolean
        useragent?: string
        class?: string
      }
    }
  }
}
