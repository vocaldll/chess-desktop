import type { WebContents } from 'electron'
import type { GameRole } from '../shared/presence'
import type { SiteId } from '../shared/sites'

interface ProbeResult {
  ready: boolean
  player: boolean
  finished: boolean
}

interface SiteSelectors {
  ready: string
  player: string
  finished: string | null
}

const SELECTORS: Record<SiteId, SiteSelectors> = {
  chesscom: {
    ready:
      'wc-chess-board, #board-layout-chessboard, [class*="board-layout"], [class*="chessboard"]',
    player:
      '[aria-label="Resign" i], [aria-label="Abort" i], [aria-label="Draw" i], [aria-label="Undo" i], [aria-label="Takeback" i], [class*="resign-button"], [class*="draw-button"], [class*="abort-button"]',
    finished: null
  },
  lichess: {
    ready: 'cg-board, .cg-wrap, .round__app, .rcontrols',
    player:
      '[class*="resign"], [class*="takeback"], [class*="draw-yes"], [title*="resign" i], [title*="abort" i], [title*="takeback" i], [title*="offer draw" i], [aria-label*="resign" i], [aria-label*="abort" i], [aria-label*="takeback" i]',
    finished: '[class*="copy-me"], [class*="rematch"]'
  }
}

function buildProbe(siteId: SiteId): string {
  const { ready, player, finished } = SELECTORS[siteId]

  return `(() => {
  const has = (selector) => {
    try {
      return Boolean(document.querySelector(selector))
    } catch {
      return false
    }
  }

  return {
    ready: has(${JSON.stringify(ready)}),
    player: has(${JSON.stringify(player)}),
    finished: ${finished ? `has(${JSON.stringify(finished)})` : 'false'}
  }
})()`
}

const PROBES: Record<SiteId, string> = {
  chesscom: buildProbe('chesscom'),
  lichess: buildProbe('lichess')
}

function toRole(result: ProbeResult): GameRole {
  if (result.player) {
    return 'playing'
  }

  if (!result.ready) {
    return 'unknown'
  }

  return result.finished ? 'finished' : 'spectating'
}

export async function probeGameRole(contents: WebContents, siteId: SiteId): Promise<GameRole> {
  try {
    return toRole((await contents.executeJavaScript(PROBES[siteId])) as ProbeResult)
  } catch {
    return 'unknown'
  }
}
