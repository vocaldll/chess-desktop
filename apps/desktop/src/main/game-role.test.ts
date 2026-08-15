import { JSDOM } from 'jsdom'
import { describe, expect, it, vi } from 'vitest'
import type { SiteId } from '../shared/sites'
import { probeGameRole } from './game-role'

const contents = (result: unknown) => ({
  executeJavaScript: vi.fn().mockResolvedValue(result),
})

async function probeScript(siteId: SiteId): Promise<string> {
  const webContents = contents({ ready: false, player: false, finished: false, aborted: false })
  await probeGameRole(webContents as never, siteId)
  return webContents.executeJavaScript.mock.calls[0][0] as string
}

function runProbe(script: string, html: string): { aborted: boolean } {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
    runScripts: 'outside-only',
  })

  return dom.window.eval(script) as { aborted: boolean }
}

describe('game role probing', () => {
  it.each([
    [{ ready: true, player: true, finished: false, aborted: false }, 'playing'],
    [{ ready: true, player: false, finished: true, aborted: false }, 'finished'],
    [{ ready: true, player: false, finished: false, aborted: false }, 'spectating'],
    [{ ready: false, player: false, finished: false, aborted: false }, 'unknown'],
    [{ ready: true, player: false, finished: true, aborted: true }, 'aborted'],
    [{ ready: true, player: false, finished: false, aborted: true }, 'aborted'],
    [{ ready: true, player: true, finished: true, aborted: true }, 'playing'],
  ] as const)('maps probe result %j to %s', async (result, expected) => {
    expect(await probeGameRole(contents(result) as never, 'lichess')).toBe(expected)
  })

  it('treats an empty result element as an abort and a filled one as a finish', async () => {
    const probe = await probeScript('lichess')

    expect(runProbe(probe, '<div class="result-wrap"><p class="result"></p></div>').aborted).toBe(
      true,
    )
    expect(
      runProbe(probe, '<div class="result-wrap"><p class="result">1-0</p></div>').aborted,
    ).toBe(false)
    expect(runProbe(probe, '<div class="result-wrap"></div>').aborted).toBe(false)
  })

  it('never reports an abort for Chess.com', async () => {
    const probe = await probeScript('chesscom')
    const html = '<div class="result-wrap"><p class="result"></p></div>'

    expect(runProbe(probe, html).aborted).toBe(false)
  })

  it('uses the site-specific probe', async () => {
    const chesscom = contents({ ready: true, player: false, finished: false, aborted: false })
    const lichess = contents({ ready: true, player: false, finished: false, aborted: false })

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
