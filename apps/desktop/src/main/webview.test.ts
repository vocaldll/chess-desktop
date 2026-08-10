import type { WebContents } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  appOn: vi.fn(),
  openExternal: vi.fn(),
  getSettings: vi.fn(),
  setLastSiteUrl: vi.fn(),
  applyVolume: vi.fn(),
  applyChatVisibility: vi.fn(),
  applyPlayerAnonymity: vi.fn(),
  applyReviewOnLichess: vi.fn(),
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
vi.mock('./chat-visibility', () => ({ applyChatVisibility: mocks.applyChatVisibility }))
vi.mock('./consent', () => ({ rejectCookieBanners: mocks.rejectCookieBanners }))
vi.mock('./discord', () => ({ updatePresenceLocation: mocks.updatePresenceLocation }))
vi.mock('./game-role', () => ({ probeGameRole: mocks.probeGameRole }))
vi.mock('./keep-awake', () => ({ updatePlayingState: mocks.updatePlayingState }))
vi.mock('./player-anonymity', () => ({ applyPlayerAnonymity: mocks.applyPlayerAnonymity }))
vi.mock('./lichess-review', () => ({ applyReviewOnLichess: mocks.applyReviewOnLichess }))

type Handler = (...args: unknown[]) => void

class FakeContents {
  readonly handlers = new Map<string, Handler[]>()
  readonly setUserAgent = vi.fn()
  readonly setAudioMuted = vi.fn()
  readonly setWindowOpenHandler = vi.fn()
  readonly setZoomFactor = vi.fn()
  readonly loadURL = vi.fn()
  readonly navigationHistory = {
    canGoBack: vi.fn(),
    canGoForward: vi.fn(),
    goBack: vi.fn(),
    goForward: vi.fn()
  }
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
    mocks.openExternal.mockResolvedValue(undefined)
    mocks.getSettings.mockReturnValue({
      activeSite: 'chesscom',
      soundMuted: false,
      hideChat: false,
      hideOpponent: true,
      hideRatings: true,
      reviewOnLichess: true,
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

  it('hardens attachment preferences and replaces untrusted initial URLs', async () => {
    const host = new FakeContents()
    const webview = await import('./webview')
    webview.hardenWebviewAttachment(host as unknown as WebContents)
    const preferences: Record<string, unknown> = { nodeIntegration: true }
    const params = { src: 'https://example.com/' }

    host.emit('will-attach-webview', {}, preferences, params)

    expect(preferences).toMatchObject({
      nodeIntegration: false,
      contextIsolation: true
    })
    expect(String(preferences.preload)).toMatch(/preload[\\/]webview\.js$/)
    expect(params.src).toBe('https://www.chess.com/')

    params.src = 'https://www.chess.com/puzzles'
    host.emit('will-attach-webview', {}, preferences, params)
    expect(params.src).toBe('https://www.chess.com/puzzles')
  })

  it('keeps same-site popups internal and sends external URLs to the browser', async () => {
    const contents = new FakeContents()
    await configure(contents)
    const openWindow = contents.setWindowOpenHandler.mock.calls[0][0]

    expect(openWindow({ url: 'https://www.chess.com/puzzles' })).toEqual({ action: 'deny' })
    expect(contents.loadURL).toHaveBeenCalledWith('https://www.chess.com/puzzles')

    expect(openWindow({ url: 'https://example.com/' })).toEqual({ action: 'deny' })
    expect(mocks.openExternal).toHaveBeenCalledWith('https://example.com/')
  })

  it('blocks external top-level navigation and reapplies page settings on readiness', async () => {
    const contents = new FakeContents()
    await configure(contents)
    const event = { preventDefault: vi.fn() }

    contents.emit('will-navigate', event, 'https://example.com/')
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(mocks.openExternal).toHaveBeenCalledWith('https://example.com/')

    contents.emit('dom-ready')
    expect(contents.setZoomFactor).toHaveBeenCalledWith(1)
    expect(mocks.applyVolume).toHaveBeenCalledWith(contents, 100)
    expect(mocks.applyChatVisibility).toHaveBeenCalledWith(contents, 'chesscom', false, true)
    expect(mocks.applyPlayerAnonymity).toHaveBeenCalledWith(contents, 'chesscom', true, true, true)
    expect(mocks.applyReviewOnLichess).toHaveBeenCalledWith(contents, 'chesscom', true, true)
    expect(mocks.rejectCookieBanners).toHaveBeenCalledWith(contents)
    expect(mocks.setLastSiteUrl).toHaveBeenCalledWith('chesscom', contents.url)
  })

  it('handles mouse navigation commands through the active history', async () => {
    const webview = await import('./webview')
    const handlers = new Map<string, Handler>()
    const window = {
      on: (event: string, handler: Handler) => handlers.set(event, handler)
    }
    const contents = new FakeContents()
    contents.navigationHistory.canGoBack.mockReturnValue(true)
    contents.navigationHistory.canGoForward.mockReturnValue(true)
    await configure(contents)
    webview.registerAppCommands(window as never)

    handlers.get('app-command')?.({}, 'browser-backward')
    handlers.get('app-command')?.({}, 'browser-forward')

    expect(contents.navigationHistory.goBack).toHaveBeenCalledOnce()
    expect(contents.navigationHistory.goForward).toHaveBeenCalledOnce()
  })

  it('publishes a probed playing role for active games', async () => {
    const contents = new FakeContents()
    contents.url = 'https://www.chess.com/game/123'
    mocks.probeGameRole.mockResolvedValue('playing')
    await configure(contents)

    contents.emit('did-navigate', {}, contents.url)

    await vi.waitFor(() => {
      expect(mocks.updatePresenceLocation).toHaveBeenCalledWith('chesscom', contents.url, 'playing')
    })
    expect(mocks.updatePlayingState).toHaveBeenCalledWith(true)

    contents.destroyed = true
    contents.emit('destroyed')
  })

  it('keeps imported Lichess boards in the reviewing state without probing', async () => {
    const contents = new FakeContents()
    contents.url = 'https://lichess.org/Ab12Cd34'
    mocks.getSettings.mockReturnValue({
      ...mocks.getSettings(),
      activeSite: 'lichess'
    })
    await configure(contents)
    const { rememberLichessReview } = await import('./lichess-review-state')
    rememberLichessReview(contents.url)

    contents.emit('did-navigate', {}, contents.url)

    expect(mocks.updatePresenceLocation).toHaveBeenLastCalledWith(
      'lichess',
      contents.url,
      'reviewing'
    )
    expect(mocks.probeGameRole).not.toHaveBeenCalled()
  })
})
