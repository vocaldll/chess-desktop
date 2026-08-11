import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '../shared/settings'

const mocks = vi.hoisted(() => ({
  applyVolume: vi.fn(),
  applyChatVisibility: vi.fn(),
  applyPlayerAnonymity: vi.fn(),
  applyNumberedArrows: vi.fn(),
  applyReviewOnLichess: vi.fn(),
  applyPresenceSettings: vi.fn(),
  getSiteWebContents: vi.fn()
}))

vi.mock('./audio', () => ({ applyVolume: mocks.applyVolume }))
vi.mock('./chat-visibility', () => ({ applyChatVisibility: mocks.applyChatVisibility }))
vi.mock('./discord', () => ({ applyPresenceSettings: mocks.applyPresenceSettings }))
vi.mock('./player-anonymity', () => ({ applyPlayerAnonymity: mocks.applyPlayerAnonymity }))
vi.mock('./numbered-arrows', () => ({ applyNumberedArrows: mocks.applyNumberedArrows }))
vi.mock('./lichess-review', () => ({ applyReviewOnLichess: mocks.applyReviewOnLichess }))
vi.mock('./webview', () => ({ getSiteWebContents: mocks.getSiteWebContents }))

import { applySetting, applySettings } from './settings-effects'

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
      hideChat: true,
      hideOpponent: true,
      hideRatings: true,
      numberedArrows: true,
      reviewOnLichess: false,
      volume: 35,
      zoom: { chesscom: 80, lichess: 125 }
    }
    mocks.getSiteWebContents.mockReturnValue(contents)

    applySettings(window as never, settings)

    expect(window.setAlwaysOnTop).toHaveBeenCalledWith(true)
    expect(contents.setAudioMuted).toHaveBeenCalledWith(true)
    expect(contents.setZoomFactor).toHaveBeenCalledWith(1.25)
    expect(mocks.applyVolume).toHaveBeenCalledWith(contents, 35)
    expect(mocks.applyChatVisibility).toHaveBeenCalledWith(contents, 'lichess', true)
    expect(mocks.applyPlayerAnonymity).toHaveBeenCalledWith(contents, 'lichess', true, true)
    expect(mocks.applyNumberedArrows).toHaveBeenCalledWith(contents, 'lichess', true)
    expect(mocks.applyReviewOnLichess).toHaveBeenCalledWith(contents, 'lichess', false)
    expect(mocks.applyPresenceSettings).toHaveBeenCalledWith(settings)
  })

  it('still updates process-level settings without a window or webview', () => {
    mocks.getSiteWebContents.mockReturnValue(null)

    applySettings(null, defaultSettings)

    expect(mocks.applyVolume).toHaveBeenCalledWith(null, defaultSettings.volume)
    expect(mocks.applyChatVisibility).toHaveBeenCalledWith(
      null,
      defaultSettings.activeSite,
      defaultSettings.hideChat
    )
    expect(mocks.applyPlayerAnonymity).toHaveBeenCalledWith(
      null,
      defaultSettings.activeSite,
      defaultSettings.hideOpponent,
      defaultSettings.hideRatings
    )
    expect(mocks.applyNumberedArrows).toHaveBeenCalledWith(
      null,
      defaultSettings.activeSite,
      defaultSettings.numberedArrows
    )
    expect(mocks.applyReviewOnLichess).toHaveBeenCalledWith(
      null,
      defaultSettings.activeSite,
      defaultSettings.reviewOnLichess
    )
    expect(mocks.applyPresenceSettings).toHaveBeenCalledWith(defaultSettings)
  })

  it('applies only the effect associated with an individual setting', () => {
    const window = { setAlwaysOnTop: vi.fn() }
    const contents = { setAudioMuted: vi.fn(), setZoomFactor: vi.fn() }
    const settings = { ...defaultSettings, volume: 35 }
    mocks.getSiteWebContents.mockReturnValue(contents)

    applySetting(window as never, settings, 'volume')

    expect(mocks.applyVolume).toHaveBeenCalledWith(contents, 35)
    expect(window.setAlwaysOnTop).not.toHaveBeenCalled()
    expect(contents.setAudioMuted).not.toHaveBeenCalled()
    expect(contents.setZoomFactor).not.toHaveBeenCalled()
    expect(mocks.applyChatVisibility).not.toHaveBeenCalled()
    expect(mocks.applyPlayerAnonymity).not.toHaveBeenCalled()
    expect(mocks.applyNumberedArrows).not.toHaveBeenCalled()
    expect(mocks.applyReviewOnLichess).not.toHaveBeenCalled()
    expect(mocks.applyPresenceSettings).not.toHaveBeenCalled()
  })

  it('defers active-site webview effects until the new webview is ready', () => {
    const contents = { setAudioMuted: vi.fn(), setZoomFactor: vi.fn() }
    const settings = { ...defaultSettings, activeSite: 'lichess' as const }
    mocks.getSiteWebContents.mockReturnValue(contents)

    applySetting(null, settings, 'activeSite')

    expect(mocks.applyPresenceSettings).toHaveBeenCalledWith(settings)
    expect(contents.setAudioMuted).not.toHaveBeenCalled()
    expect(contents.setZoomFactor).not.toHaveBeenCalled()
    expect(mocks.applyVolume).not.toHaveBeenCalled()
    expect(mocks.applyNumberedArrows).not.toHaveBeenCalled()
  })
})
