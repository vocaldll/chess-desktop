import { beforeEach, describe, expect, it, vi } from 'vitest'

type Listener = (...args: unknown[]) => void

const api = {
  getInfo: vi.fn(),
  check: vi.fn(),
  install: vi.fn(),
  listeners: new Map<string, Listener>(),
  onAvailable: vi.fn((listener: Listener) => api.listeners.set('available', listener)),
  onFailed: vi.fn((listener: Listener) => api.listeners.set('failed', listener)),
  onDownloaded: vi.fn((listener: Listener) => api.listeners.set('downloaded', listener)),
  onInstallFailed: vi.fn((listener: Listener) => api.listeners.set('install-failed', listener))
}

async function freshUpdates() {
  vi.resetModules()
  window.api = { updates: api } as unknown as typeof window.api
  return (await import('./updates.svelte')).updates
}

describe('update store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listeners.clear()
    api.getInfo.mockResolvedValue({
      version: '1.0.0',
      canCheck: true,
      downloadedVersion: null
    })
  })

  it('loads update capabilities and an existing download', async () => {
    api.getInfo.mockResolvedValue({
      version: '1.0.0',
      canCheck: true,
      downloadedVersion: '1.1.0'
    })

    const updates = await freshUpdates()
    await vi.waitFor(() => expect(updates.info).not.toBeNull())

    expect(updates.info).toMatchObject({ version: '1.0.0', canCheck: true })
    expect(updates.downloadedVersion).toBe('1.1.0')
    expect(updates.infoFailed).toBe(false)
  })

  it('records update information failures', async () => {
    api.getInfo.mockRejectedValue(new Error('IPC unavailable'))

    const updates = await freshUpdates()
    await vi.waitFor(() => expect(updates.infoFailed).toBe(true))

    expect(updates.info).toBeNull()
  })

  it('checks once and records success or failure', async () => {
    api.check.mockResolvedValue({ status: 'current' })
    const updates = await freshUpdates()
    await vi.waitFor(() => expect(updates.info).not.toBeNull())

    const first = updates.check()
    const second = updates.check()
    await Promise.all([first, second])

    expect(api.check).toHaveBeenCalledOnce()
    expect(updates.checkResult).toEqual({ status: 'current' })
    expect(updates.checking).toBe(false)

    api.check.mockRejectedValue(new Error('offline'))
    await updates.check()
    expect(updates.checkResult).toEqual({ status: 'error' })
  })

  it('reacts to background updater events and guards installation', async () => {
    const updates = await freshUpdates()
    await vi.waitFor(() => expect(updates.info).not.toBeNull())

    api.listeners.get('available')?.('1.2.0')
    expect(updates.checkResult).toEqual({ status: 'available', version: '1.2.0' })

    api.listeners.get('downloaded')?.('1.2.0')
    expect(updates.downloadedVersion).toBe('1.2.0')

    updates.install()
    updates.install()
    expect(api.install).toHaveBeenCalledOnce()
    expect(updates.installing).toBe(true)

    api.listeners.get('install-failed')?.()
    expect(updates.installing).toBe(false)
    api.listeners.get('failed')?.()
    expect(updates.checkResult).toEqual({ status: 'error' })
  })
})
