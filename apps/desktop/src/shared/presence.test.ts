import { describe, expect, it } from 'vitest'
import { describePresence, type GameRole, isPlayingGame, needsGameRole } from './presence'
import type { SiteId } from './sites'

describe('game-role requirements', () => {
  it.each([
    ['chesscom', 'https://www.chess.com/game/live/123'],
    ['chesscom', 'https://www.chess.com/game/daily/456'],
    ['chesscom', 'https://www.chess.com/play/computer'],
    ['lichess', 'https://lichess.org/Ab12Cd34']
  ] as const)('requires a role probe for %s URL %s', (siteId, url) => {
    expect(needsGameRole(siteId, url)).toBe(true)
  })

  it.each([
    ['chesscom', 'https://www.chess.com/play/online'],
    ['chesscom', 'https://www.chess.com/puzzles'],
    ['lichess', 'https://lichess.org/Ab12Cd34Ef56'],
    ['lichess', 'https://lichess.org/training']
  ] as const)('does not require a role probe for %s URL %s', (siteId, url) => {
    expect(needsGameRole(siteId, url)).toBe(false)
  })
})

describe('playing state', () => {
  it('recognizes Lichess player URLs without a role probe', () => {
    expect(isPlayingGame('lichess', 'https://lichess.org/Ab12Cd34Ef56')).toBe(true)
  })

  it('requires a playing role for spectator-shaped URLs', () => {
    const url = 'https://lichess.org/Ab12Cd34'
    expect(isPlayingGame('lichess', url, 'playing')).toBe(true)
    expect(isPlayingGame('lichess', url, 'spectating')).toBe(false)
  })

  it('requires a playing role for Chess.com games', () => {
    const url = 'https://www.chess.com/game/live/123'
    expect(isPlayingGame('chesscom', url, 'playing')).toBe(true)
    expect(isPlayingGame('chesscom', url, 'unknown')).toBe(false)
  })

  it('does not treat non-game pages as playing', () => {
    expect(isPlayingGame('lichess', 'https://lichess.org/training', 'playing')).toBe(false)
    expect(isPlayingGame('chesscom', 'https://www.chess.com/home', 'playing')).toBe(false)
  })
})

describe('presence descriptions', () => {
  it.each([
    ['chesscom', 'https://www.chess.com/', 'unknown', 'Browsing'],
    ['chesscom', 'https://www.chess.com/puzzles', 'unknown', 'Solving puzzles'],
    [
      'chesscom',
      'https://www.chess.com/lessons/learn-the-openings',
      'unknown',
      'Studying openings'
    ],
    ['chesscom', 'https://www.chess.com/analysis', 'unknown', 'Analyzing a position'],
    ['chesscom', 'https://www.chess.com/game/live/123', 'playing', 'Playing a game'],
    ['chesscom', 'https://www.chess.com/game/live/123', 'spectating', 'Reviewing a game'],
    ['chesscom', 'https://www.chess.com/game/live/123', 'finished', 'Reviewing a game'],
    ['lichess', 'https://lichess.org/training', 'unknown', 'Solving puzzles'],
    ['lichess', 'https://lichess.org/study/example', 'unknown', 'Analyzing a position'],
    ['lichess', 'https://lichess.org/broadcast/event', 'unknown', 'Watching a game'],
    ['lichess', 'https://lichess.org/Ab12Cd34Ef56', 'unknown', 'Playing a game'],
    ['lichess', 'https://lichess.org/Ab12Cd34', 'spectating', 'Watching a game'],
    ['lichess', 'https://lichess.org/Ab12Cd34', 'finished', 'Reviewing a game']
  ] as const)(
    'describes %s URL %s as %s',
    (siteId: SiteId, url: string, role: GameRole, expected: string) => {
      const presence = describePresence(siteId, url, role)
      expect(presence.details).toBe(expected)
      expect(presence.state).toBe(siteId === 'chesscom' ? 'Chess.com' : 'Lichess')
      expect(presence.assetKey).toBe(siteId)
    }
  )

  it('falls back to browsing for malformed and unknown routes', () => {
    expect(describePresence('chesscom', 'invalid').details).toBe('Browsing')
    expect(describePresence('lichess', 'https://lichess.org/forum').details).toBe('Browsing')
    expect(describePresence('lichess', 'https://lichess.org/abcdefgh').details).toBe('Browsing')
  })
})
