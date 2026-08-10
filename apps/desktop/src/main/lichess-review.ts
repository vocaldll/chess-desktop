import type { WebContents } from 'electron'
import type { SiteId } from '../shared/sites'

const REVIEW_BUTTON_CSS = `
  [data-chess-desktop-review-on-lichess] {
    background: linear-gradient(to bottom, #3c3936 0%, #33312e 100%) !important;
    border: 1px solid #4d4a47 !important;
    border-radius: 4px !important;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5) !important;
    color: #b3b3b3 !important;
    margin-top: 0.8rem;
    text-shadow: 0 1px 1px #000 !important;
  }

  [data-chess-desktop-review-on-lichess]:hover {
    background: linear-gradient(to bottom, #4a4744 0%, #3c3936 100%) !important;
    border-color: #5a5754 !important;
    color: #fff !important;
  }

  .game-history-games-accuracy-cell [data-chess-desktop-review-on-lichess] {
    margin-top: 0;
  }
`

interface ReviewButtonState {
  destroy(): void
}

type ReviewWindow = Window & {
  __chessDesktopLichessReview?: ReviewButtonState
}

export function installReviewButtons(): void {
  const marker = 'data-chess-desktop-review-on-lichess'
  const selector =
    'a.cc-button-component[href*="/analysis/game/"][aria-label="Game Review"], a.game-accuracy-review-button[href*="/analysis/game/"]'
  const stateWindow = window as ReviewWindow

  stateWindow.__chessDesktopLichessReview?.destroy()

  let scheduled = false

  const addButtons = (): void => {
    scheduled = false

    for (const reviewLink of document.querySelectorAll<HTMLAnchorElement>(selector)) {
      if (reviewLink.nextElementSibling?.hasAttribute(marker)) {
        continue
      }

      let reviewUrl: URL
      try {
        reviewUrl = new URL(reviewLink.href, location.href)
      } catch {
        continue
      }

      const match = reviewUrl.pathname.match(/^\/analysis\/game\/([a-z-]+)\/(\d+)/)
      if (!match) {
        continue
      }

      reviewUrl.pathname = `/game/${match[1]}/${match[2]}`
      reviewUrl.search = ''
      reviewUrl.hash = ''

      const compact = reviewLink.classList.contains('game-accuracy-review-button')
      const button = document.createElement('button')
      button.type = 'button'
      button.className = reviewLink.className
      button.setAttribute(marker, '')
      button.setAttribute('data-chess-desktop-game-url', reviewUrl.toString())
      button.setAttribute('aria-label', 'Review on Lichess')
      button.title = 'Import this game to Lichess and request a computer analysis'
      button.textContent = compact ? 'Lichess' : 'Review on Lichess'
      reviewLink.insertAdjacentElement('afterend', button)
    }
  }

  const schedule = (): void => {
    if (scheduled) {
      return
    }

    scheduled = true
    queueMicrotask(addButtons)
  }

  const observer = new MutationObserver(schedule)
  observer.observe(document.documentElement, { childList: true, subtree: true })

  stateWindow.__chessDesktopLichessReview = {
    destroy: () => {
      observer.disconnect()
      document.querySelectorAll(`[${marker}]`).forEach((button) => {
        button.remove()
      })
      delete stateWindow.__chessDesktopLichessReview
    }
  }

  addButtons()
}

export function removeReviewButtons(): void {
  const stateWindow = window as ReviewWindow
  stateWindow.__chessDesktopLichessReview?.destroy()
  document.querySelectorAll('[data-chess-desktop-review-on-lichess]').forEach((button) => {
    button.remove()
  })
}

const insertedStyles = new WeakMap<WebContents, string>()
const operationVersions = new WeakMap<WebContents, number>()
const appliedSettings = new WeakMap<WebContents, { siteId: SiteId; enabled: boolean }>()

export function applyReviewOnLichess(
  contents: WebContents | null,
  siteId: SiteId,
  enabled: boolean,
  refresh = false
): void {
  if (!contents || contents.isDestroyed()) {
    return
  }

  const applied = appliedSettings.get(contents)
  if (!refresh && applied?.siteId === siteId && applied.enabled === enabled) {
    return
  }

  appliedSettings.set(contents, { siteId, enabled })

  const version = (operationVersions.get(contents) ?? 0) + 1
  operationVersions.set(contents, version)

  const previousKey = insertedStyles.get(contents)
  insertedStyles.delete(contents)

  if (previousKey) {
    contents.removeInsertedCSS(previousKey).catch(() => null)
  }

  if (!enabled || siteId !== 'chesscom') {
    contents.executeJavaScript(`(${removeReviewButtons.toString()})()`).catch(() => null)
    return
  }

  contents
    .insertCSS(REVIEW_BUTTON_CSS)
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

  contents.executeJavaScript(`(${installReviewButtons.toString()})()`).catch(() => null)
}
