import type { SiteId } from '../../shared/sites'

export const SELF_MARKER = 'data-chess-desktop-self'
export const SELF_LINK_MARKER = 'data-chess-desktop-me'
export const OPPONENT_LINK_MARKER = 'data-chess-desktop-them'

export interface OpponentRule {
  selectors: readonly string[]
  body: string
}

export interface AnonymityAdapter {
  seatPrefix: string
  ratingSelectors: readonly string[]
  additionalRatingSelectors: readonly string[]
  rules: readonly OpponentRule[]
  linkRules?: readonly OpponentRule[]
  readSelf: string
  readSeat: string
  markLinks?: string
  watchSelector: string
  watchClasses: readonly string[]
}

export interface GameRoleAdapter {
  ready: string
  player: string
  finished: string | null
  result: string | null
}

export interface SiteCapabilities {
  chatVisibility: boolean
  playerAnonymity: boolean
  numberedArrows: boolean
  reviewOnLichess: boolean
}

export interface SiteAdapter {
  id: SiteId
  capabilities: SiteCapabilities
  chatHiddenCss: string
  gameRole: GameRoleAdapter
  anonymity: AnonymityAdapter
}
