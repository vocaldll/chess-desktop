import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '../../shared/settings'

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  randomUUID: vi.fn()
}))

vi.mock('node:crypto', () => ({ randomUUID: mocks.randomUUID }))
vi.mock('./transport', () => ({ connect: mocks.connect }))

interface Connection {
  handlers: {
    onReady: () => void
    onClose: () => void
  }
  send: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}

const connections: Connection[] = []

async function freshPresence() {
  vi.resetModules()
  return import('./index')
}

function enabledSettings() {
  return { ...defaultSettings, discordRpcEnabled: true }
}

describe('Discord Rich Presence lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    vi.clearAllMocks()
    connections.length = 0
    mocks.randomUUID.mockReturnValue('nonce-123')
    mocks.connect.mockImplementation((_clientId, handlers) => {
      const connection = { handlers, send: vi.fn(), close: vi.fn() }
      connections.push(connection)
      return connection
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('connects only when enabled and publishes after readiness', async () => {
    const presence = await freshPresence()

    presence.applyPresenceSettings(defaultSettings)
    expect(mocks.connect).not.toHaveBeenCalled()

    presence.applyPresenceSettings(enabledSettings())
    expect(mocks.connect).toHaveBeenCalledOnce()
    expect(connections[0].send).not.toHaveBeenCalled()

    connections[0].handlers.onReady()
    expect(connections[0].send).toHaveBeenCalledWith(
      expect.objectContaining({
        cmd: 'SET_ACTIVITY',
        nonce: 'nonce-123',
        args: expect.objectContaining({
          activity: expect.objectContaining({
            buttons: [{ label: 'Chess Desktop', url: 'https://chessdesktop.app' }]
          })
        })
      })
    )

    presence.shutdownPresence()
  })

  it('rate-limits changed activity and skips duplicate updates', async () => {
    const presence = await freshPresence()
    presence.applyPresenceSettings(enabledSettings())
    connections[0].handlers.onReady()
    connections[0].send.mockClear()

    presence.updatePresenceLocation('chesscom', 'https://www.chess.com/game/123', 'playing')
    presence.updatePresenceLocation('chesscom', 'https://www.chess.com/game/123', 'playing')
    expect(connections[0].send).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(4_000)
    expect(connections[0].send).toHaveBeenCalledOnce()
    expect(connections[0].send.mock.calls[0][0]).toMatchObject({
      args: { activity: { details: 'Playing a game' } }
    })

    presence.updatePresenceLocation('chesscom', 'https://www.chess.com/game/123', 'playing')
    await vi.advanceTimersByTimeAsync(4_000)
    expect(connections[0].send).toHaveBeenCalledOnce()

    presence.shutdownPresence()
  })

  it('publishes imported Lichess games directly as reviews', async () => {
    const presence = await freshPresence()
    presence.applyPresenceSettings(enabledSettings())
    connections[0].handlers.onReady()
    connections[0].send.mockClear()

    presence.updatePresenceLocation('lichess', 'https://lichess.org/Ab12Cd34', 'reviewing')
    presence.applyPresenceSettings({
      ...enabledSettings(),
      activeSite: 'lichess'
    })

    await vi.advanceTimersByTimeAsync(4_000)
    expect(connections[0].send.mock.calls[0][0]).toMatchObject({
      args: { activity: { details: 'Reviewing a game' } }
    })

    presence.shutdownPresence()
  })

  it('reconnects after a remote close while still enabled', async () => {
    const presence = await freshPresence()
    presence.applyPresenceSettings(enabledSettings())
    connections[0].handlers.onClose()

    expect(mocks.connect).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(14_999)
    expect(mocks.connect).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1)
    expect(mocks.connect).toHaveBeenCalledTimes(2)

    presence.shutdownPresence()
  })

  it('clears activity and closes the transport when disabled', async () => {
    const presence = await freshPresence()
    presence.applyPresenceSettings(enabledSettings())
    connections[0].handlers.onReady()
    connections[0].send.mockClear()

    presence.applyPresenceSettings(defaultSettings)

    expect(connections[0].send).toHaveBeenCalledWith(
      expect.objectContaining({ args: expect.objectContaining({ activity: undefined }) })
    )
    expect(connections[0].close).toHaveBeenCalledOnce()
  })
})
