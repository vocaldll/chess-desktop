import type { WebviewLoadError } from '$shared/ipc-channels'
import { SITES, type SiteId } from '$shared/sites'
import type { SiteWebviewElement } from './webview-element'

class Browser {
  element = $state<SiteWebviewElement | null>(null)
  url = $state('')
  canGoBack = $state(false)
  canGoForward = $state(false)
  isLoading = $state(false)
  error = $state<WebviewLoadError | null>(null)

  #lastUrls = new Map<SiteId, string>()

  rememberedUrl(siteId: SiteId): string {
    return this.#lastUrls.get(siteId) ?? SITES[siteId].startUrl
  }

  enterSite(siteId: SiteId): void {
    this.url = this.rememberedUrl(siteId)
    this.canGoBack = false
    this.canGoForward = false
    this.isLoading = false
    this.error = null
  }

  attach(element: SiteWebviewElement): void {
    this.element = element
  }

  detach(): void {
    this.element = null
  }

  syncHistory(siteId: SiteId): void {
    const element = this.element
    if (!element) {
      return
    }

    const current = element.getURL()
    if (current) {
      this.url = current
      this.#lastUrls.set(siteId, current)
    }

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
