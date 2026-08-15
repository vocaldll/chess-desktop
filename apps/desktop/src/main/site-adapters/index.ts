import type { SiteId } from '../../shared/sites'
import { chessComAdapter } from './chesscom'
import { lichessAdapter } from './lichess'
import type { SiteAdapter } from './types'

export const SITE_ADAPTERS = {
  chesscom: chessComAdapter,
  lichess: lichessAdapter,
} satisfies Record<SiteId, SiteAdapter>

export function getSiteAdapter(siteId: SiteId): SiteAdapter {
  return SITE_ADAPTERS[siteId]
}

export type { AnonymityAdapter, GameRoleAdapter, SiteAdapter } from './types'
