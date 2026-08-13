import type { WebContents } from 'electron'
import type { GameRole } from '../shared/presence'
import type { SiteId } from '../shared/sites'
import { getSiteAdapter } from './site-adapters'

interface ProbeResult {
  ready: boolean
  player: boolean
  finished: boolean
  aborted: boolean
}

function buildProbe(siteId: SiteId): string {
  const { ready, player, finished, result } = getSiteAdapter(siteId).gameRole

  return `(() => {
  const has = (selector) => {
    try {
      return Boolean(document.querySelector(selector))
    } catch {
      return false
    }
  }

  const undecided = (selector) => {
    try {
      const node = document.querySelector(selector)
      return Boolean(node) && !(node.textContent || '').trim()
    } catch {
      return false
    }
  }

  return {
    ready: has(${JSON.stringify(ready)}),
    player: has(${JSON.stringify(player)}),
    finished: ${finished ? `has(${JSON.stringify(finished)})` : 'false'},
    aborted: ${result ? `undecided(${JSON.stringify(result)})` : 'false'}
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

  if (result.aborted) {
    return 'aborted'
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
