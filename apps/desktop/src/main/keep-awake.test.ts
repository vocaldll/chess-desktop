import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '../shared/settings'

const blocker = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn()
}))

vi.mock('electron', () => ({ powerSaveBlocker: blocker }))

async function freshModule() {
  vi.resetModules()
  return import('./keep-awake')
}

describe('keep-awake state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    blocker.start.mockReturnValue(42)
  })

  it('starts only while enabled and playing', async () => {
    const keepAwake = await freshModule()

    keepAwake.applyKeepAwakeSettings({ ...defaultSettings, keepAwakeWhilePlaying: true })
    expect(blocker.start).not.toHaveBeenCalled()

    keepAwake.updatePlayingState(true)
    expect(blocker.start).toHaveBeenCalledWith('prevent-display-sleep')
    expect(blocker.start).toHaveBeenCalledOnce()

    keepAwake.updatePlayingState(true)
    expect(blocker.start).toHaveBeenCalledOnce()
  })

  it('stops when play ends or the setting is disabled', async () => {
    const keepAwake = await freshModule()

    keepAwake.applyKeepAwakeSettings({ ...defaultSettings, keepAwakeWhilePlaying: true })
    keepAwake.updatePlayingState(true)
    keepAwake.updatePlayingState(false)

    expect(blocker.stop).toHaveBeenCalledWith(42)
  })

  it('cleans up during shutdown', async () => {
    const keepAwake = await freshModule()

    keepAwake.applyKeepAwakeSettings({ ...defaultSettings, keepAwakeWhilePlaying: true })
    keepAwake.updatePlayingState(true)
    keepAwake.shutdownKeepAwake()

    expect(blocker.stop).toHaveBeenCalledWith(42)
  })
})
