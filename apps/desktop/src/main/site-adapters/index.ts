import type { SiteId } from '../../shared/sites'
import { chessComAdapter } from './chesscom'
import type { SiteAdapter } from './types'

export const SITE_ADAPTERS: Partial<Record<SiteId, SiteAdapter>> = {
  chesscom: chessComAdapter
}

export function getSiteAdapter(siteId: SiteId): SiteAdapter | undefined {
  return SITE_ADAPTERS[siteId]
}

export type { AnonymityAdapter, GameRoleAdapter, SiteAdapter } from './types'
