import { beforeEach, describe, expect, it, vi } from 'vitest'

const getLastSiteUrls = vi.fn()

async function freshBrowser() {
  vi.resetModules()
  window.api = { webview: { getLastSiteUrls } } as unknown as typeof window.api
  return (await import('./browser.svelte')).browser
}

function webview(url = 'https://www.chess.com/game/123') {
  return {
    getURL: vi.fn().mockReturnValue(url),
    canGoBack: vi.fn().mockReturnValue(true),
    canGoForward: vi.fn().mockReturnValue(false),
    goBack: vi.fn(),
    goForward: vi.fn(),
    reload: vi.fn(),
    loadURL: vi.fn().mockResolvedValue(undefined)
  }
}

describe('browser store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLastSiteUrls.mockResolvedValue({
      chesscom: 'https://www.chess.com/home',
      lichess: 'https://lichess.org/training'
    })
  })

  it('loads and enters the remembered page for each site', async () => {
    const browser = await freshBrowser()

    expect(browser.rememberedUrl('chesscom')).toBe('https://www.chess.com/')
    await browser.load()
    browser.enterSite('lichess')

    expect(browser.url).toBe('https://lichess.org/training')
    expect(browser.canGoBack).toBe(false)
    expect(browser.canGoForward).toBe(false)
    expect(browser.isLoading).toBe(false)
    expect(browser.error).toBeNull()
  })

  it('synchronizes history and remembers the latest non-empty URL', async () => {
    const browser = await freshBrowser()
    const element = webview()
    browser.attach(element as never)

    browser.syncHistory('chesscom')

    expect(browser.url).toBe('https://www.chess.com/game/123')
    expect(browser.rememberedUrl('chesscom')).toBe('https://www.chess.com/game/123')
    expect(browser.canGoBack).toBe(true)
    expect(browser.canGoForward).toBe(false)

    element.getURL.mockReturnValue('')
    browser.syncHistory('chesscom')
    expect(browser.url).toBe('https://www.chess.com/game/123')
  })

  it('routes navigation commands and clears stale errors', async () => {
    const browser = await freshBrowser()
    const element = webview()
    browser.attach(element as never)
    browser.error = { errorCode: -105, errorDescription: 'offline', validatedURL: 'test' }

    browser.back()
    browser.forward()
    browser.reload()
    browser.navigate('https://www.chess.com/puzzles')

    expect(element.goBack).toHaveBeenCalledOnce()
    expect(element.goForward).toHaveBeenCalledOnce()
    expect(element.reload).toHaveBeenCalledOnce()
    expect(element.loadURL).toHaveBeenCalledWith('https://www.chess.com/puzzles')
    expect(browser.error).toBeNull()

    browser.detach()
    expect(browser.element).toBeNull()
  })

  it('contains navigation promise failures', async () => {
    const browser = await freshBrowser()
    const element = webview()
    element.loadURL.mockRejectedValue(new Error('navigation failed'))
    browser.attach(element as never)

    browser.navigate('https://www.chess.com/puzzles')
    await Promise.resolve()

    expect(element.loadURL).toHaveBeenCalledOnce()
  })
})
