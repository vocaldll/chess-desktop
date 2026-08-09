import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '../../shared/settings'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  applySettings: vi.fn(),
  getSettings: vi.fn(),
  setSetting: vi.fn()
}))

vi.mock('electron', () => ({ ipcMain: { handle: mocks.handle } }))
vi.mock('../settings-effects', () => ({ applySettings: mocks.applySettings }))
vi.mock('../store', () => ({
  getSettings: mocks.getSettings,
  setSetting: mocks.setSetting
}))

import { IPC } from '../../shared/ipc-channels'
import { registerSettingsIpc } from './settings'

type Handler = (...args: unknown[]) => unknown

function handler(channel: string): Handler {
  const registration = mocks.handle.mock.calls.find(([registered]) => registered === channel)
  if (!registration) {
    throw new Error(`Missing handler for ${channel}`)
  }
  return registration[1]
}

describe('settings IPC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSettings.mockReturnValue(defaultSettings)
    registerSettingsIpc(() => ({ id: 'window' }) as never)
  })

  it('returns all persisted settings', () => {
    expect(handler(IPC.settings.getAll)()).toBe(defaultSettings)
  })

  it('rejects unknown setting keys', () => {
    expect(() => handler(IPC.settings.set)({}, 'not-a-setting', true)).toThrow(
      'Unknown setting: not-a-setting'
    )
    expect(mocks.setSetting).not.toHaveBeenCalled()
  })

  it('rejects invalid values for known settings', () => {
    expect(() => handler(IPC.settings.set)({}, 'volume', 101)).toThrow(
      'Invalid value for setting: volume'
    )
    expect(mocks.setSetting).not.toHaveBeenCalled()
  })

  it('persists valid settings and applies the resulting state', () => {
    const updated = { ...defaultSettings, volume: 40 }
    const window = { id: 'window' }
    mocks.setSetting.mockReturnValue(updated)
    mocks.handle.mockClear()
    registerSettingsIpc(() => window as never)

    expect(handler(IPC.settings.set)({}, 'volume', 40)).toBe(updated)
    expect(mocks.setSetting).toHaveBeenCalledWith('volume', 40)
    expect(mocks.applySettings).toHaveBeenCalledWith(window, updated)
  })
})
