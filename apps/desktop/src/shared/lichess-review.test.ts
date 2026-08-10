import { describe, expect, it } from 'vitest'
import { isReviewPgn, lichessGameKey } from './lichess-review'

const pgn = `[Event "Live Chess"]
[Site "Chess.com"]
[Result "1-0"]

1. e4 e5 2. Nf3 1-0`

describe('Lichess review handoff', () => {
  it('accepts bounded PGNs with an event and result', () => {
    expect(isReviewPgn(pgn)).toBe(true)
    expect(isReviewPgn('[Event "Live Chess"]\n\n1. e4')).toBe(false)
    expect(isReviewPgn('not a PGN')).toBe(false)
    expect(isReviewPgn(null)).toBe(false)
  })

  it('extracts the stable game key from Lichess board URLs', () => {
    expect(lichessGameKey('https://lichess.org/Ab12Cd34')).toBe('Ab12Cd34')
    expect(lichessGameKey('https://lichess.org/Ab12Cd34Ef56/black')).toBe('Ab12Cd34')
    expect(lichessGameKey('https://lichess.org/paste')).toBeNull()
  })
})
