import type { WebviewLoadError } from '$shared/ipc-channels'
import type { ChessWebviewElement } from './webview-element'

class Browser {
  element = $state<ChessWebviewElement | null>(null)
  url = $state('')
  canGoBack = $state(false)
  canGoForward = $state(false)
  isLoading = $state(false)
  error = $state<WebviewLoadError | null>(null)

  attach(element: ChessWebviewElement): void {
    this.element = element
  }

  detach(): void {
    this.element = null
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

  navigate(url: string): void {
    this.error = null
    this.element?.loadURL(url)
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
}

export const browser = new Browser()
