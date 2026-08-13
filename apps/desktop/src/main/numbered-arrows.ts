import type { WebContents } from 'electron'
import {
  NUMBERED_ARROWS_UPDATE_CHANNEL,
  type NumberedArrowsUpdate
} from '../shared/numbered-arrows'
import type { SiteId } from '../shared/sites'
import { getSiteAdapter } from './site-adapters'

export function applyNumberedArrows(
  contents: WebContents | null,
  siteId: SiteId,
  enabled: boolean
): void {
  if (!contents || contents.isDestroyed()) {
    return
  }

  const adapter = getSiteAdapter(siteId)
  const update: NumberedArrowsUpdate = {
    enabled: enabled && (adapter?.capabilities.numberedArrows ?? true),
    siteId
  }
  contents.send(NUMBERED_ARROWS_UPDATE_CHANNEL, update)
}
