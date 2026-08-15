import { describe, expect, it } from 'vitest'
import {
  coerceLastSiteUrls,
  DEFAULT_LAST_SITE_URLS,
  isOpenableExternally,
  isSiteId,
  isSiteURL,
  normalizeSiteInput,
} from './sites'

describe('site identifiers', () => {
  it.each(['chesscom', 'lichess'])('accepts %s', (value) => {
    expect(isSiteId(value)).toBe(true)
  })

  it.each(['chess.com', 'Lichess', '', null, 1, {}])('rejects %j', (value) => {
    expect(isSiteId(value)).toBe(false)
  })
})

describe('site URL validation', () => {
  it.each([
    ['chesscom', 'https://chess.com/'],
    ['chesscom', 'https://www.chess.com/play/online'],
    ['chesscom', 'http://support.chess.com/article'],
    ['lichess', 'https://lichess.org/'],
    ['lichess', 'https://api.lichess.org/api'],
  ] as const)('accepts %s URL %s', (siteId, url) => {
    expect(isSiteURL(siteId, url)).toBe(true)
  })

  it.each([
    ['chesscom', 'https://chess.com.example.org/'],
    ['chesscom', 'https://evilchess.com/'],
    ['chesscom', 'https://chess.com@evil.example/'],
    ['chesscom', 'ftp://chess.com/game'],
    ['chesscom', 'javascript:alert(1)'],
    ['lichess', 'https://notlichess.org/'],
    ['lichess', 'not a URL'],
  ] as const)('rejects %s URL %s', (siteId, url) => {
    expect(isSiteURL(siteId, url)).toBe(false)
  })
})

describe('last site URL coercion', () => {
  it('preserves valid URLs independently', () => {
    expect(
      coerceLastSiteUrls({
        chesscom: 'https://www.chess.com/game/live/123',
        lichess: 'https://lichess.org/abcdefgh',
      }),
    ).toEqual({
      chesscom: 'https://www.chess.com/game/live/123',
      lichess: 'https://lichess.org/abcdefgh',
    })
  })

  it.each([null, undefined, [], 'invalid'])('uses defaults for %j', (value) => {
    expect(coerceLastSiteUrls(value)).toEqual(DEFAULT_LAST_SITE_URLS)
  })

  it('replaces only invalid entries', () => {
    expect(
      coerceLastSiteUrls({
        chesscom: 'https://example.com/',
        lichess: 'https://lichess.org/training',
      }),
    ).toEqual({
      chesscom: DEFAULT_LAST_SITE_URLS.chesscom,
      lichess: 'https://lichess.org/training',
    })
  })
})

describe('site input normalization', () => {
  it.each([
    ['/play/online', 'https://www.chess.com/play/online'],
    [' chess.com/puzzles ', 'https://chess.com/puzzles'],
    ['https://support.chess.com/article', 'https://support.chess.com/article'],
    ['HTTP://CHESS.COM/game', 'HTTP://CHESS.COM/game'],
  ])('normalizes %j', (input, expected) => {
    expect(normalizeSiteInput('chesscom', input)).toBe(expected)
  })

  it.each(['', '   ', 'lichess.org', 'https://example.com', '//example.com', 'javascript:1'])(
    'rejects %j for Chess.com',
    (input) => {
      expect(normalizeSiteInput('chesscom', input)).toBeNull()
    },
  )
})

describe('external URL validation', () => {
  it.each(['https://example.com', 'http://example.com', 'mailto:test@example.com'])(
    'allows %s',
    (url) => {
      expect(isOpenableExternally(url)).toBe(true)
    },
  )

  it.each(['file:///tmp/test', 'javascript:alert(1)', 'data:text/plain,test', 'invalid'])(
    'rejects %s',
    (url) => {
      expect(isOpenableExternally(url)).toBe(false)
    },
  )
})
