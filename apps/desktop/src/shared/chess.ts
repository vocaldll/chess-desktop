export const CHESS_START_URL = 'https://www.chess.com/'
export const CHESS_PARTITION = 'persist:chess'

const CHESS_HOST = 'chess.com'
const EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:'])

export function isChessURL(value: string): boolean {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return false
  }

  return url.hostname === CHESS_HOST || url.hostname.endsWith(`.${CHESS_HOST}`)
}

export function normalizeChessInput(raw: string): string | null {
  const value = raw.trim()

  if (!value) {
    return null
  }

  let candidate: string

  if (value.startsWith('/')) {
    candidate = `https://www.${CHESS_HOST}${value}`
  } else if (/^https?:\/\//i.test(value)) {
    candidate = value
  } else {
    candidate = `https://${value}`
  }

  return isChessURL(candidate) ? candidate : null
}

export function isOpenableExternally(value: string): boolean {
  try {
    return EXTERNAL_PROTOCOLS.has(new URL(value).protocol)
  } catch {
    return false
  }
}
