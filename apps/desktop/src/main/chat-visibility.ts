import type { WebContents } from 'electron'
import type { SiteId } from '../shared/sites'
import { InsertedCss } from './inserted-css'

const CHAT_CSS: Record<SiteId, string> = {
  chesscom:
    '.resizable-chat-area-component, [data-tab="GameViewTab.Chat"] { display: none !important; }',
  lichess: '.mchat { display: none !important; }'
}

const styles = new InsertedCss()
const appliedSettings = new WeakMap<WebContents, { siteId: SiteId; hidden: boolean }>()

export function applyChatVisibility(
  contents: WebContents | null,
  siteId: SiteId,
  hidden: boolean,
  refresh = false
): void {
  if (!contents || contents.isDestroyed()) {
    return
  }

  const applied = appliedSettings.get(contents)
  if (!refresh && applied?.siteId === siteId && applied.hidden === hidden) {
    return
  }

  appliedSettings.set(contents, { siteId, hidden })

  styles.replace(contents, hidden ? CHAT_CSS[siteId] : null)
}
