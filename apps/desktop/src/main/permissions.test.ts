import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fromPartition: vi.fn(),
  getSettings: vi.fn(),
}))

vi.mock('electron', () => ({
  session: { fromPartition: mocks.fromPartition },
}))

vi.mock('./store', () => ({
  getSettings: mocks.getSettings,
}))

import { isPermissionAllowed, registerPermissions } from './permissions'

describe('permission policy', () => {
  it.each(['notifications', 'fullscreen', 'clipboard-sanitized-write'])(
    'allows supported main-frame permission %s',
    (permission) => {
      expect(
        isPermissionAllowed('chesscom', permission, 'https://www.chess.com/play', true, true),
      ).toBe(true)
    },
  )

  it('honors the notification setting', () => {
    expect(
      isPermissionAllowed('lichess', 'notifications', 'https://lichess.org/', true, false),
    ).toBe(false)
  })

  it.each(['media', 'geolocation', 'display-capture', 'clipboard-read', 'unknown'])(
    'denies unsupported permission %s',
    (permission) => {
      expect(
        isPermissionAllowed('lichess', permission, 'https://lichess.org/game', true, true),
      ).toBe(false)
    },
  )

  it('denies supported permissions from subframes', () => {
    expect(
      isPermissionAllowed('chesscom', 'fullscreen', 'https://www.chess.com/video', false, true),
    ).toBe(false)
  })

  it.each([
    'https://chess.com.example.org/',
    'https://lichess.org/',
    'file:///tmp/test',
    'invalid',
  ])('denies requests from untrusted URL %s', (url) => {
    expect(isPermissionAllowed('chesscom', 'notifications', url, true, true)).toBe(false)
  })
})

describe('permission registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSettings.mockReturnValue({ notificationsEnabled: true })
  })

  it('registers request and check handlers for both site partitions', () => {
    const sessions = [
      { setPermissionRequestHandler: vi.fn(), setPermissionCheckHandler: vi.fn() },
      { setPermissionRequestHandler: vi.fn(), setPermissionCheckHandler: vi.fn() },
    ]
    mocks.fromPartition.mockReturnValueOnce(sessions[0]).mockReturnValueOnce(sessions[1])

    registerPermissions()

    expect(mocks.fromPartition.mock.calls).toEqual([['persist:chess'], ['persist:lichess']])
    for (const siteSession of sessions) {
      expect(siteSession.setPermissionRequestHandler).toHaveBeenCalledOnce()
      expect(siteSession.setPermissionCheckHandler).toHaveBeenCalledOnce()
    }
  })

  it('uses the latest notification setting when handling a request', () => {
    const siteSession = {
      setPermissionRequestHandler: vi.fn(),
      setPermissionCheckHandler: vi.fn(),
    }
    mocks.fromPartition.mockReturnValue(siteSession)
    registerPermissions()

    const handler = siteSession.setPermissionRequestHandler.mock.calls[0][0]
    const callback = vi.fn()

    mocks.getSettings.mockReturnValue({ notificationsEnabled: false })
    handler({}, 'notifications', callback, {
      requestingUrl: 'https://www.chess.com/',
      isMainFrame: true,
    })

    expect(callback).toHaveBeenCalledWith(false)
  })
})
