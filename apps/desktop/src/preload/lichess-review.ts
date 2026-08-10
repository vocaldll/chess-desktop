import { ipcRenderer } from 'electron'
import {
  CHESSCOM_REVIEW_PENDING_PARAM,
  isReviewPgn,
  REVIEW_ON_LICHESS_CHANNEL,
  REVIEW_ON_LICHESS_FAILED_CHANNEL,
  REVIEW_ON_LICHESS_MARKER
} from '../shared/lichess-review'

const ELEMENT_TIMEOUT = 8_000

function restorePendingReviewButton(): void {
  const button = document.querySelector<HTMLButtonElement>(
    `[${REVIEW_ON_LICHESS_MARKER}][aria-busy="true"]`
  )
  if (!button) {
    return
  }

  button.disabled = false
  button.removeAttribute('aria-busy')
  button.textContent = button.dataset.chessDesktopReviewLabel ?? 'Review on Lichess'
  button.title = 'Lichess could not import this game. Try again.'
  delete button.dataset.chessDesktopReviewLabel
}

function waitForElement<T extends Element>(selector: string): Promise<T | null> {
  const existing = document.querySelector<T>(selector)
  if (existing) {
    return Promise.resolve(existing)
  }

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const element = document.querySelector<T>(selector)
      if (!element) {
        return
      }

      clearTimeout(timeout)
      observer.disconnect()
      resolve(element)
    })
    const timeout = setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, ELEMENT_TIMEOUT)

    observer.observe(document.documentElement, { childList: true, subtree: true })
  })
}

function gameKey(value: string): string | null {
  try {
    const url = new URL(value, location.href)
    const match = url.pathname.match(/^\/game\/([a-z-]+)\/(\d+)/)
    return match ? `${match[1]}/${match[2]}` : null
  } catch {
    return null
  }
}

function cleanPendingReviewUrl(): void {
  try {
    const url = new URL(location.href)
    if (!url.searchParams.has(CHESSCOM_REVIEW_PENDING_PARAM)) {
      return
    }

    url.searchParams.delete(CHESSCOM_REVIEW_PENDING_PARAM)
    history.replaceState(history.state, '', url)
  } catch {
    return
  }
}

async function readCurrentGamePgn(): Promise<string | null> {
  const existingModal = document.querySelector('#share-modal dialog[open]')
  const shareButton = await waitForElement<HTMLButtonElement>('button[aria-label="Share"]')
  if (!shareButton) {
    return null
  }

  if (!existingModal) {
    shareButton.click()
  }

  const pgnElement = await waitForElement<HTMLElement>('#share-modal [pgn]')
  const pgn = pgnElement?.getAttribute('pgn') ?? null

  if (!existingModal) {
    document.querySelector<HTMLButtonElement>('#share-modal button[aria-label="Close"]')?.click()
  }

  return isReviewPgn(pgn) ? pgn : null
}

async function sendCurrentGameToLichess(button?: HTMLButtonElement): Promise<void> {
  if (document.querySelector(`[${REVIEW_ON_LICHESS_MARKER}][aria-busy="true"]`)) {
    return
  }

  const label = button?.textContent ?? ''

  if (button) {
    button.dataset.chessDesktopReviewLabel = label
    button.disabled = true
    button.setAttribute('aria-busy', 'true')
    button.textContent = 'Opening Lichess…'
  }

  const pgn = await readCurrentGamePgn()
  cleanPendingReviewUrl()

  if (pgn) {
    ipcRenderer.sendToHost(REVIEW_ON_LICHESS_CHANNEL, pgn)
    return
  }

  if (button?.isConnected) {
    button.disabled = false
    button.removeAttribute('aria-busy')
    button.textContent = label
    button.title = "Couldn't read this game's PGN"
  }
}

function onReviewClick(event: MouseEvent): void {
  const target = event.target instanceof Element ? event.target : null
  const button = target?.closest<HTMLButtonElement>(`[${REVIEW_ON_LICHESS_MARKER}]`)
  if (!button) {
    return
  }

  event.preventDefault()
  event.stopImmediatePropagation()

  const gameUrl = button.getAttribute('data-chess-desktop-game-url')
  const requestedGame = gameUrl ? gameKey(gameUrl) : null
  if (!gameUrl || !requestedGame) {
    return
  }

  if (gameKey(location.href) === requestedGame) {
    void sendCurrentGameToLichess(button)
    return
  }

  const targetUrl = new URL(gameUrl)
  targetUrl.searchParams.set(CHESSCOM_REVIEW_PENDING_PARAM, '1')
  location.assign(targetUrl.toString())
}

function continuePendingChesscomReview(): void {
  let url: URL
  try {
    url = new URL(location.href)
  } catch {
    return
  }

  if (
    (url.hostname === 'chess.com' || url.hostname.endsWith('.chess.com')) &&
    url.searchParams.get(CHESSCOM_REVIEW_PENDING_PARAM) === '1'
  ) {
    void sendCurrentGameToLichess()
  }
}

export function installLichessReviewBridge(): void {
  document.addEventListener('click', onReviewClick, true)
  ipcRenderer.on(REVIEW_ON_LICHESS_FAILED_CHANNEL, restorePendingReviewButton)

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', continuePendingChesscomReview, { once: true })
  } else {
    continuePendingChesscomReview()
  }
}
