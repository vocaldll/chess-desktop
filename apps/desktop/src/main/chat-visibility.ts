import type { WebContents } from 'electron'
import type { SiteId } from '../shared/sites'

const CHAT_CSS: Record<SiteId, string> = {
  chesscom:
    '.resizable-chat-area-component, [data-tab="GameViewTab.Chat"] { display: none !important; }',
  lichess: '.mchat { display: none !important; }'
}

const insertedStyles = new WeakMap<WebContents, string>()
const operationVersions = new WeakMap<WebContents, number>()
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

  const version = (operationVersions.get(contents) ?? 0) + 1
  operationVersions.set(contents, version)

  const previousKey = insertedStyles.get(contents)
  insertedStyles.delete(contents)

  if (previousKey) {
    contents.removeInsertedCSS(previousKey).catch(() => null)
  }

  if (!hidden) {
    return
  }

  contents
    .insertCSS(CHAT_CSS[siteId])
    .then((key) => {
      if (contents.isDestroyed()) {
        return
      }

      if (operationVersions.get(contents) !== version) {
        contents.removeInsertedCSS(key).catch(() => null)
        return
      }

      insertedStyles.set(contents, key)
    })
    .catch(() => null)
}
