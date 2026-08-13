import type { WebContents } from 'electron'
import type { SiteId } from '../shared/sites'
import { InsertedCss } from './inserted-css'
import { getSiteAdapter } from './site-adapters'

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

  let frame = 0

  const addButtons = (): void => {
    frame = 0

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
    if (frame) {
      return
    }

    frame = requestAnimationFrame(addButtons)
  }

  const containsReviewLink = (node: Node): boolean => {
    if (!(node instanceof Element)) {
      return false
    }

    return node.matches(selector) || Boolean(node.querySelector(selector))
  }

  const containsReviewButton = (node: Node): boolean => {
    return (
      node instanceof Element &&
      (node.hasAttribute(marker) || Boolean(node.querySelector(`[${marker}]`)))
    )
  }

  const observer = new MutationObserver((mutations) => {
    if (
      mutations.some(
        (mutation) =>
          [...mutation.addedNodes].some(containsReviewLink) ||
          [...mutation.removedNodes].some(
            (node) => containsReviewLink(node) || containsReviewButton(node)
          )
      )
    ) {
      schedule()
    }
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })

  stateWindow.__chessDesktopLichessReview = {
    destroy: () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
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

const styles = new InsertedCss()
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

  const styleVersion = styles.start(contents)

  if (!enabled || !getSiteAdapter(siteId)?.capabilities.reviewOnLichess) {
    contents.executeJavaScript(`(${removeReviewButtons.toString()})()`).catch(() => null)
    return
  }

  styles.insert(contents, styleVersion, REVIEW_BUTTON_CSS)

  contents.executeJavaScript(`(${installReviewButtons.toString()})()`).catch(() => null)
}
