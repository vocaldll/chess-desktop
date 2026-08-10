import type { SiteId } from './sites'

export const NUMBERED_ARROWS_UPDATE_CHANNEL = 'numbered-arrows:update'

export interface NumberedArrowsUpdate {
  enabled: boolean
  siteId: SiteId
}
