export type SiteId = 'chesscom' | 'lichess'

export type LastSiteUrls = Record<SiteId, string>

export interface Site {
  id: SiteId
  name: string
  host: string
  startUrl: string
  partition: string
}

export const SITES: Record<SiteId, Site> = {
  chesscom: {
    id: 'chesscom',
    name: 'Chess.com',
    host: 'chess.com',
    startUrl: 'https://www.chess.com/',
    partition: 'persist:chess',
  },
  lichess: {
    id: 'lichess',
    name: 'Lichess',
    host: 'lichess.org',
    startUrl: 'https://lichess.org/',
    partition: 'persist:lichess',
  },
}

export const SITE_ORDER: readonly SiteId[] = ['chesscom', 'lichess']

export const DEFAULT_SITE: SiteId = 'chesscom'

export const DEFAULT_LAST_SITE_URLS: LastSiteUrls = {
  chesscom: SITES.chesscom.startUrl,
  lichess: SITES.lichess.startUrl,
}

const EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:'])

export function isSiteId(value: unknown): value is SiteId {
  return typeof value === 'string' && Object.hasOwn(SITES, value)
}

export function isSiteURL(siteId: SiteId, value: string): boolean {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    return false
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return false
  }

  const { host } = SITES[siteId]
  return url.hostname === host || url.hostname.endsWith(`.${host}`)
}

export function coerceLastSiteUrls(raw: unknown): LastSiteUrls {
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const result = { ...DEFAULT_LAST_SITE_URLS }

  for (const id of SITE_ORDER) {
    const value = source[id]
    if (typeof value === 'string' && isSiteURL(id, value)) {
      result[id] = value
    }
  }

  return result
}

export function normalizeSiteInput(siteId: SiteId, raw: string): string | null {
  const value = raw.trim()

  if (!value) {
    return null
  }

  let candidate: string

  if (value.startsWith('/')) {
    candidate = new URL(value, SITES[siteId].startUrl).toString()
  } else if (/^https?:\/\//i.test(value)) {
    candidate = value
  } else {
    candidate = `https://${value}`
  }

  return isSiteURL(siteId, candidate) ? candidate : null
}

export function isOpenableExternally(value: string): boolean {
  try {
    return EXTERNAL_PROTOCOLS.has(new URL(value).protocol)
  } catch {
    return false
  }
}
