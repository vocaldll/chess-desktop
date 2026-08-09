import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '$shared/settings'

const getAll = vi.fn()
const set = vi.fn()

async function freshSettings() {
  vi.resetModules()
  window.api = { settings: { getAll, set } } as unknown as typeof window.api
  return (await import('./settings.svelte')).settings
}

describe('settings store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAll.mockResolvedValue({ ...defaultSettings })
  })

  it('loads the complete settings state', async () => {
    const settings = await freshSettings()

    await settings.load()

    expect(settings.current).toEqual(defaultSettings)
    expect(settings.loaded).toBe(true)
  })

  it('replaces local state with the value returned after a setting change', async () => {
    const settings = await freshSettings()
    const updated = { ...defaultSettings, soundMuted: true }
    set.mockResolvedValue(updated)

    await settings.set('soundMuted', true)

    expect(set).toHaveBeenCalledWith('soundMuted', true)
    expect(settings.current).toEqual(updated)
  })

  it('updates one site zoom without changing the other', async () => {
    const settings = await freshSettings()
    settings.current = { ...defaultSettings, zoom: { chesscom: 90, lichess: 110 } }
    set.mockImplementation(async (_key, zoom) => ({ ...settings.current, zoom }))

    await settings.setZoom('lichess', 125)

    expect(set).toHaveBeenCalledWith('zoom', { chesscom: 90, lichess: 125 })
    expect(settings.current.zoom).toEqual({ chesscom: 90, lichess: 125 })
  })
})
