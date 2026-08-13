import type { WebContents } from 'electron'
import type { SiteId } from '../shared/sites'
import { InsertedCss } from './inserted-css'
import { getSiteAdapter } from './site-adapters'

const LICHESS_CHAT_CSS = '.mchat { display: none !important; }'

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

  const adapter = getSiteAdapter(siteId)
  const css = adapter?.capabilities.chatVisibility ? adapter.chatHiddenCss : LICHESS_CHAT_CSS
  styles.replace(contents, hidden ? css : null)
}
