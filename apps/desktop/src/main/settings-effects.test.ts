import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '../shared/settings'

const mocks = vi.hoisted(() => ({
  applyVolume: vi.fn(),
  applyPresenceSettings: vi.fn(),
  applyKeepAwakeSettings: vi.fn(),
  getSiteWebContents: vi.fn()
}))

vi.mock('./audio', () => ({ applyVolume: mocks.applyVolume }))
vi.mock('./discord', () => ({ applyPresenceSettings: mocks.applyPresenceSettings }))
vi.mock('./keep-awake', () => ({ applyKeepAwakeSettings: mocks.applyKeepAwakeSettings }))
vi.mock('./webview', () => ({ getSiteWebContents: mocks.getSiteWebContents }))

import { applySettings } from './settings-effects'

describe('applySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies window and active webview settings', () => {
    const window = { setAlwaysOnTop: vi.fn() }
    const contents = { setAudioMuted: vi.fn(), setZoomFactor: vi.fn() }
    const settings = {
      ...defaultSettings,
      activeSite: 'lichess' as const,
      alwaysOnTop: true,
      soundMuted: true,
      volume: 35,
      zoom: { chesscom: 80, lichess: 125 }
    }
    mocks.getSiteWebContents.mockReturnValue(contents)

    applySettings(window as never, settings)

    expect(window.setAlwaysOnTop).toHaveBeenCalledWith(true)
    expect(contents.setAudioMuted).toHaveBeenCalledWith(true)
    expect(contents.setZoomFactor).toHaveBeenCalledWith(1.25)
    expect(mocks.applyVolume).toHaveBeenCalledWith(contents, 35)
    expect(mocks.applyPresenceSettings).toHaveBeenCalledWith(settings)
    expect(mocks.applyKeepAwakeSettings).toHaveBeenCalledWith(settings)
  })

  it('still updates process-level settings without a window or webview', () => {
    mocks.getSiteWebContents.mockReturnValue(null)

    applySettings(null, defaultSettings)

    expect(mocks.applyVolume).toHaveBeenCalledWith(null, defaultSettings.volume)
    expect(mocks.applyPresenceSettings).toHaveBeenCalledWith(defaultSettings)
    expect(mocks.applyKeepAwakeSettings).toHaveBeenCalledWith(defaultSettings)
  })
})
