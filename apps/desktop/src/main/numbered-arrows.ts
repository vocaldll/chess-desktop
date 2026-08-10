import type { WebContents } from 'electron'
import {
  NUMBERED_ARROWS_UPDATE_CHANNEL,
  type NumberedArrowsUpdate
} from '../shared/numbered-arrows'
import type { SiteId } from '../shared/sites'

export function applyNumberedArrows(
  contents: WebContents | null,
  siteId: SiteId,
  enabled: boolean
): void {
  if (!contents || contents.isDestroyed()) {
    return
  }

  const update: NumberedArrowsUpdate = { enabled, siteId }
  contents.send(NUMBERED_ARROWS_UPDATE_CHANNEL, update)
}
