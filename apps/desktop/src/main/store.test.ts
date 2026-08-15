import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '../shared/settings'
import { DEFAULT_LAST_SITE_URLS } from '../shared/sites'

const paths = vi.hoisted(() => ({ userData: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => paths.userData },
}))

async function freshStore() {
  vi.resetModules()
  return import('./store')
}

async function readState(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(paths.userData, 'state.json'), 'utf8')) as Record<
    string,
    unknown
  >
}

describe('state store', () => {
  beforeEach(async () => {
    paths.userData = await mkdtemp(join(tmpdir(), 'chess-desktop-store-'))
    vi.useFakeTimers()
  })

  afterEach(async () => {
    vi.clearAllTimers()
    vi.useRealTimers()
    await rm(paths.userData, { recursive: true, force: true })
  })

  it('returns defaults when no persisted state exists', async () => {
    const store = await freshStore()

    expect(store.getSettings()).toEqual(defaultSettings)
    expect(store.getLastSiteUrls()).toEqual(DEFAULT_LAST_SITE_URLS)
    expect(store.getWindowBounds()).toEqual({ width: 1280, height: 820, isMaximized: false })
  })

  it('recovers from malformed persisted JSON', async () => {
    await writeFile(join(paths.userData, 'state.json'), '{invalid', 'utf8')
    const store = await freshStore()

    expect(store.getSettings()).toEqual(defaultSettings)
  })

  it('coerces persisted state at the storage boundary', async () => {
    await writeFile(
      join(paths.userData, 'state.json'),
      JSON.stringify({
        settings: { activeSite: 'lichess', volume: -1, soundMuted: true },
        window: { width: 100, height: 200, x: 'invalid', y: 20, isMaximized: true },
        lastSiteUrls: {
          chesscom: 'https://example.com/',
          lichess: 'https://lichess.org/training',
        },
      }),
      'utf8',
    )
    const store = await freshStore()

    expect(store.getSettings()).toEqual({
      ...defaultSettings,
      activeSite: 'lichess',
      soundMuted: true,
    })
    expect(store.getWindowBounds()).toEqual({
      width: 800,
      height: 600,
      x: undefined,
      y: 20,
      isMaximized: true,
    })
    expect(store.getLastSiteUrls()).toEqual({
      chesscom: DEFAULT_LAST_SITE_URLS.chesscom,
      lichess: 'https://lichess.org/training',
    })
  })

  it('debounces rapid mutations and persists the latest state', async () => {
    const store = await freshStore()

    store.setSetting('volume', 20)
    await vi.advanceTimersByTimeAsync(499)
    await expect(access(join(paths.userData, 'state.json'))).rejects.toThrow()

    store.setSetting('volume', 30)
    await vi.advanceTimersByTimeAsync(499)
    await expect(access(join(paths.userData, 'state.json'))).rejects.toThrow()

    await vi.advanceTimersByTimeAsync(1)
    await store.flushState()

    expect((await readState()).settings).toMatchObject({ volume: 30 })
  })

  it('flushes settings, URLs, and window bounds immediately on request', async () => {
    const store = await freshStore()

    store.setSetting('alwaysOnTop', true)
    store.setLastSiteUrl('lichess', 'https://lichess.org/training')
    store.setWindowBounds({ width: 1440, height: 900, x: 10, y: 20, isMaximized: false })
    await store.flushState()

    expect(await readState()).toMatchObject({
      settings: { alwaysOnTop: true },
      lastSiteUrls: { lichess: 'https://lichess.org/training' },
      window: { width: 1440, height: 900, x: 10, y: 20, isMaximized: false },
    })
  })

  it('ignores invalid and unchanged site URLs without scheduling a write', async () => {
    const store = await freshStore()

    store.setLastSiteUrl('chesscom', DEFAULT_LAST_SITE_URLS.chesscom)
    store.setLastSiteUrl('chesscom', 'https://example.com/')
    await vi.advanceTimersByTimeAsync(1_000)

    await expect(access(join(paths.userData, 'state.json'))).rejects.toThrow()
  })

  it('logs background persistence failures and retries the dirty state', async () => {
    const store = await freshStore()
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await rm(paths.userData, { recursive: true })
    await writeFile(paths.userData, 'not a directory', 'utf8')
    store.setSetting('soundMuted', true)

    await vi.advanceTimersByTimeAsync(500)
    await vi.waitFor(() => {
      expect(error).toHaveBeenCalledWith('Failed to persist state:', expect.any(Error))
    })

    await rm(paths.userData)
    await mkdir(paths.userData)
    await expect(store.flushState()).resolves.toBeUndefined()
    expect((await readState()).settings).toMatchObject({ soundMuted: true })

    error.mockRestore()
  })

  it('rejects explicit flush failures without clearing the dirty state', async () => {
    const store = await freshStore()

    await rm(paths.userData, { recursive: true })
    await writeFile(paths.userData, 'not a directory', 'utf8')
    store.setSetting('alwaysOnTop', true)

    await expect(store.flushState()).rejects.toThrow()

    await rm(paths.userData)
    await mkdir(paths.userData)
    await store.flushState()
    expect((await readState()).settings).toMatchObject({ alwaysOnTop: true })
  })
})
