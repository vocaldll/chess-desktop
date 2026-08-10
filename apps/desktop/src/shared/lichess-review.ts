export const REVIEW_ON_LICHESS_CHANNEL = 'review-on-lichess'
export const REVIEW_ON_LICHESS_FAILED_CHANNEL = 'review-on-lichess-failed'
export const REVIEW_ON_LICHESS_MARKER = 'data-chess-desktop-review-on-lichess'
export const CHESSCOM_REVIEW_PENDING_PARAM = 'chessDesktopReview'
export const LICHESS_IMPORT_URL = 'https://lichess.org/paste'

const MAX_PGN_LENGTH = 1_000_000

export function isReviewPgn(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_PGN_LENGTH &&
    /^\s*\[Event\s+"[^"]*"\]/.test(value) &&
    /\[Result\s+"(?:1-0|0-1|1\/2-1\/2|\*)"\]/.test(value)
  )
}

export function lichessGameKey(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.hostname !== 'lichess.org') {
      return null
    }

    const segment = url.pathname.split('/')[1] ?? ''
    return /^[A-Za-z0-9]{8}(?:[A-Za-z0-9]{4})?$/.test(segment) ? segment.slice(0, 8) : null
  } catch {
    return null
  }
}
