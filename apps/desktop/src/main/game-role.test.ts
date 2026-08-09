import { describe, expect, it, vi } from 'vitest'
import { probeGameRole } from './game-role'

const contents = (result: unknown) => ({
  executeJavaScript: vi.fn().mockResolvedValue(result)
})

describe('game role probing', () => {
  it.each([
    [{ ready: true, player: true, finished: false }, 'playing'],
    [{ ready: true, player: false, finished: true }, 'finished'],
    [{ ready: true, player: false, finished: false }, 'spectating'],
    [{ ready: false, player: false, finished: false }, 'unknown']
  ] as const)('maps probe result %j to %s', async (result, expected) => {
    expect(await probeGameRole(contents(result) as never, 'lichess')).toBe(expected)
  })

  it('uses the site-specific probe', async () => {
    const chesscom = contents({ ready: true, player: false, finished: false })
    const lichess = contents({ ready: true, player: false, finished: false })

    await probeGameRole(chesscom as never, 'chesscom')
    await probeGameRole(lichess as never, 'lichess')

    expect(chesscom.executeJavaScript.mock.calls[0][0]).toContain('wc-chess-board')
    expect(lichess.executeJavaScript.mock.calls[0][0]).toContain('cg-board')
  })

  it('returns unknown when JavaScript execution fails', async () => {
    const failing = { executeJavaScript: vi.fn().mockRejectedValue(new Error('destroyed')) }

    expect(await probeGameRole(failing as never, 'chesscom')).toBe('unknown')
  })
})
