import type { WebContents } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  appOn: vi.fn(),
  openExternal: vi.fn(),
  getSettings: vi.fn(),
  setLastSiteUrl: vi.fn(),
  applyVolume: vi.fn(),
  rejectCookieBanners: vi.fn(),
  updatePresenceLocation: vi.fn(),
  probeGameRole: vi.fn(),
  updatePlayingState: vi.fn()
}))

vi.mock('electron', () => ({
  app: { on: mocks.appOn },
  shell: { openExternal: mocks.openExternal }
}))

vi.mock('./store', () => ({
  getSettings: mocks.getSettings,
  setLastSiteUrl: mocks.setLastSiteUrl
}))

vi.mock('./audio', () => ({ applyVolume: mocks.applyVolume }))
vi.mock('./consent', () => ({ rejectCookieBanners: mocks.rejectCookieBanners }))
vi.mock('./discord', () => ({ updatePresenceLocation: mocks.updatePresenceLocation }))
vi.mock('./game-role', () => ({ probeGameRole: mocks.probeGameRole }))
vi.mock('./keep-awake', () => ({ updatePlayingState: mocks.updatePlayingState }))

type Handler = (...args: unknown[]) => void

class FakeContents {
  readonly handlers = new Map<string, Handler[]>()
  readonly setUserAgent = vi.fn()
  readonly setAudioMuted = vi.fn()
  readonly setWindowOpenHandler = vi.fn()
  readonly setZoomFactor = vi.fn()
  readonly loadURL = vi.fn()
  destroyed = false
  url = 'https://www.chess.com/home'

  getType(): string {
    return 'webview'
  }

  isDestroyed(): boolean {
    return this.destroyed
  }

  getURL(): string {
    return this.url
  }

  on(event: string, handler: Handler): this {
    const handlers = this.handlers.get(event) ?? []
    handlers.push(handler)
    this.handlers.set(event, handlers)
    return this
  }

  emit(event: string, ...args: unknown[]): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(...args)
    }
  }
}

async function configure(contents: FakeContents, send = vi.fn()) {
  const webview = await import('./webview')
  const window = { webContents: { send } }
  webview.registerWebviewHandling(() => window as never)

  const created = mocks.appOn.mock.calls.find(([event]) => event === 'web-contents-created')?.[1]
  if (!created) {
    throw new Error('web-contents-created handler was not registered')
  }

  created({}, contents as unknown as WebContents)
  return { send, webview }
}

describe('webview event scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mocks.getSettings.mockReturnValue({
      activeSite: 'chesscom',
      soundMuted: false,
      volume: 100,
      zoom: { chesscom: 100, lichess: 100 }
    })
    mocks.probeGameRole.mockResolvedValue('unknown')
  })

  it('forwards only current main-frame load failures', async () => {
    const contents = new FakeContents()
    const { send } = await configure(contents)

    contents.emit('did-fail-load', {}, -105, 'ERR_NAME_NOT_RESOLVED', contents.url, false)
    contents.emit('did-fail-load', {}, -3, 'ERR_ABORTED', contents.url, true)
    expect(send).not.toHaveBeenCalled()

    contents.emit('did-fail-load', {}, -105, 'ERR_NAME_NOT_RESOLVED', contents.url, true)
    expect(send).toHaveBeenCalledWith('webview:load-error', {
      errorCode: -105,
      errorDescription: 'ERR_NAME_NOT_RESOLVED',
      validatedURL: contents.url
    })
  })

  it('ignores loading and navigation events from a superseded webview', async () => {
    const first = new FakeContents()
    const second = new FakeContents()
    const send = vi.fn()

    await configure(first, send)
    await configure(second, send)

    first.emit('did-start-loading')
    first.emit('did-stop-loading')
    first.emit('did-navigate', {}, first.url)

    expect(send).not.toHaveBeenCalled()
    expect(mocks.setLastSiteUrl).not.toHaveBeenCalled()

    second.emit('did-start-loading')
    second.emit('did-stop-loading')
    second.emit('did-navigate', {}, second.url)

    expect(send.mock.calls).toEqual([['webview:load-start'], ['webview:load-stop']])
    expect(mocks.setLastSiteUrl).toHaveBeenCalledWith('chesscom', second.url)
  })

  it('clears the active contents only when the current webview is destroyed', async () => {
    const first = new FakeContents()
    const second = new FakeContents()

    const { webview } = await configure(first)
    await configure(second)
    first.destroyed = true
    first.emit('destroyed')

    expect(webview.getSiteWebContents()).toBe(second)

    second.destroyed = true
    second.emit('destroyed')
    expect(webview.getSiteWebContents()).toBeNull()
    expect(mocks.updatePlayingState).toHaveBeenCalledWith(false)
  })
})
