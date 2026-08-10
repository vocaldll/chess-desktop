export interface GuestIpcMessageEvent extends Event {
  channel: string
  args: unknown[]
}

export interface SiteWebviewElement extends HTMLElement {
  src: string
  goBack(): void
  goForward(): void
  reload(): void
  stop(): void
  canGoBack(): boolean
  canGoForward(): boolean
  getURL(): string
  loadURL(url: string): Promise<void>
  send(channel: string, ...args: unknown[]): void
}
