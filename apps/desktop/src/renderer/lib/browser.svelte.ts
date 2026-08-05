import type { WebviewLoadError } from '$shared/ipc-channels'
import type { SiteWebviewElement } from './webview-element'

class Browser {
  element = $state<SiteWebviewElement | null>(null)
  url = $state('')
  canGoBack = $state(false)
  canGoForward = $state(false)
  isLoading = $state(false)
  error = $state<WebviewLoadError | null>(null)

  attach(element: SiteWebviewElement): void {
    this.element = element
  }

  detach(): void {
    this.element = null
    this.url = ''
    this.canGoBack = false
    this.canGoForward = false
    this.isLoading = false
    this.error = null
  }

  syncHistory(): void {
    const element = this.element
    if (!element) {
      return
    }

    this.url = element.getURL()
    this.canGoBack = element.canGoBack()
    this.canGoForward = element.canGoForward()
  }

  back(): void {
    this.element?.goBack()
  }

  forward(): void {
    this.element?.goForward()
  }

  reload(): void {
    this.error = null
    this.element?.reload()
  }

  navigate(url: string): void {
    this.error = null
    this.element?.loadURL(url)
  }
}

export const browser = new Browser()
