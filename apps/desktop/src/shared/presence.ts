import { SITES, type SiteId } from './sites'

export type GameRole = 'unknown' | 'playing' | 'spectating' | 'finished' | 'aborted' | 'reviewing'

export interface Presence {
  details: string
  state: string
  assetKey: string
  assetText: string
}

const BROWSING = 'Browsing'
const PLAYING = 'Playing a game'
const WATCHING_GAME = 'Watching a game'
const LOOKING = 'Looking for a game'
const REVIEWING = 'Reviewing a game'
const PUZZLES = 'Solving puzzles'
const LESSON = 'Taking a lesson'
const ANALYSIS = 'Analyzing a position'
const OPENINGS = 'Studying openings'

const CHESSCOM_ACTIVITIES: Record<string, string> = {
  puzzles: PUZZLES,
  'solo-chess': PUZZLES,
  daily: PUZZLES,
  learn: LESSON,
  courses: LESSON,
  classroom: LESSON,
  train: LESSON,
  practice: LESSON,
  vision: LESSON,
  endgames: LESSON,
  'learn-how-to-play-chess': LESSON,
  tv: WATCHING_GAME,
  'computer-chess-championship': WATCHING_GAME,
  variants: LOOKING,
  votechess: PLAYING,
}

const LICHESS_ACTIVITIES: Record<string, string> = {
  training: PUZZLES,
  puzzle: PUZZLES,
  storm: PUZZLES,
  racer: PUZZLES,
  streak: PUZZLES,
  analysis: ANALYSIS,
  study: ANALYSIS,
  editor: ANALYSIS,
  opening: OPENINGS,
  paste: ANALYSIS,
  importer: ANALYSIS,
  tv: WATCHING_GAME,
  learn: LESSON,
  practice: LESSON,
  coordinate: LESSON,
}

const LICHESS_NON_GAME = new Set([
  '@',
  'about',
  'account',
  'ads',
  'app',
  'appeal',
  'challenge',
  'class',
  'coach',
  'contact',
  'dasher',
  'faq',
  'forum',
  'games',
  'inbox',
  'insights',
  'login',
  'mobile',
  'page',
  'patron',
  'player',
  'privacy',
  'report',
  'settings',
  'signup',
  'simul',
  'source',
  'streamer',
  'swiss',
  'team',
  'timeline',
  'tournament',
  'video',
])

const CHESSCOM_GAME_ID = /^\d+$/
const LICHESS_SPECTATOR_ID = /^[A-Za-z0-9]{8}$/
const LICHESS_PLAYER_ID = /^[A-Za-z0-9]{12}$/
const LICHESS_ID_ENTROPY = /[A-Z0-9]/

function pathSegments(url: string): string[] {
  try {
    return new URL(url).pathname.split('/').slice(1)
  } catch {
    return []
  }
}

function isChesscomGameURL(segments: string[]): boolean {
  const [first, second, third] = segments

  if (first !== 'game') {
    return false
  }

  return CHESSCOM_GAME_ID.test(second ?? '') || CHESSCOM_GAME_ID.test(third ?? '')
}

const LIVE_GAME_LABELS: Record<GameRole, string> = {
  playing: PLAYING,
  spectating: WATCHING_GAME,
  finished: REVIEWING,
  aborted: BROWSING,
  reviewing: REVIEWING,
  unknown: PLAYING,
}

const ARCHIVED_GAME_LABELS: Record<GameRole, string> = {
  playing: PLAYING,
  spectating: REVIEWING,
  finished: REVIEWING,
  aborted: REVIEWING,
  reviewing: REVIEWING,
  unknown: REVIEWING,
}

const LICHESS_GAME_LABELS: Record<GameRole, string> = {
  playing: PLAYING,
  spectating: WATCHING_GAME,
  finished: REVIEWING,
  aborted: BROWSING,
  reviewing: REVIEWING,
  unknown: WATCHING_GAME,
}

const LICHESS_PLAYER_LABELS: Record<GameRole, string> = {
  playing: PLAYING,
  spectating: REVIEWING,
  finished: REVIEWING,
  aborted: BROWSING,
  reviewing: REVIEWING,
  unknown: PLAYING,
}

const SOLO_PLAY_LABELS: Record<GameRole, string> = {
  playing: PLAYING,
  spectating: LOOKING,
  finished: REVIEWING,
  aborted: LOOKING,
  reviewing: REVIEWING,
  unknown: LOOKING,
}

const CHESSCOM_SOLO_MODES = new Set(['computer', 'coach'])

function chesscomGameLabels(second: string | undefined): Record<GameRole, string> {
  const ongoing = CHESSCOM_GAME_ID.test(second ?? '') || second === 'daily'
  return ongoing ? LIVE_GAME_LABELS : ARCHIVED_GAME_LABELS
}

function isChesscomSoloPlayURL(segments: string[]): boolean {
  const [first, second] = segments
  return first === 'play' && CHESSCOM_SOLO_MODES.has(second ?? '')
}

function chesscomPlayActivity(
  second: string | undefined,
  third: string | undefined,
  role: GameRole,
): string {
  if (CHESSCOM_SOLO_MODES.has(second ?? '')) {
    return SOLO_PLAY_LABELS[role]
  }

  return third === 'watch' || third === 'tournaments' ? BROWSING : LOOKING
}

function chesscomActivity(segments: string[], role: GameRole): string {
  const [first, second, third] = segments

  if (first === 'play') {
    return chesscomPlayActivity(second, third, role)
  }

  if (first === 'analysis') {
    return second === 'game' ? REVIEWING : ANALYSIS
  }

  if (first === 'lessons') {
    return second === 'learn-the-openings' ? OPENINGS : LESSON
  }

  if (first === 'games') {
    return second === 'archive' ? BROWSING : ANALYSIS
  }

  if (first === 'events') {
    return second ? WATCHING_GAME : BROWSING
  }

  if (first === 'game') {
    if (!isChesscomGameURL(segments)) {
      return BROWSING
    }

    return chesscomGameLabels(second)[role]
  }

  return CHESSCOM_ACTIVITIES[first ?? ''] ?? BROWSING
}

function isLichessGameId(segment: string, pattern: RegExp): boolean {
  return pattern.test(segment) && LICHESS_ID_ENTROPY.test(segment)
}

function isLichessSpectatorURL(segments: string[]): boolean {
  const [first] = segments

  if (first === undefined || Object.hasOwn(LICHESS_ACTIVITIES, first)) {
    return false
  }

  return !LICHESS_NON_GAME.has(first) && isLichessGameId(first, LICHESS_SPECTATOR_ID)
}

function isLichessPlayerURL(segments: string[]): boolean {
  const [first] = segments

  if (first === undefined || Object.hasOwn(LICHESS_ACTIVITIES, first)) {
    return false
  }

  return !LICHESS_NON_GAME.has(first) && isLichessGameId(first, LICHESS_PLAYER_ID)
}

function lichessActivity(segments: string[], role: GameRole): string {
  const [first, second] = segments

  if (role === 'reviewing') {
    return REVIEWING
  }

  if (first === undefined) {
    return BROWSING
  }

  if (first === 'training' && second === 'coordinate') {
    return LESSON
  }

  if (first === 'broadcast' || first === 'relay') {
    return second ? WATCHING_GAME : BROWSING
  }

  if (Object.hasOwn(LICHESS_ACTIVITIES, first)) {
    return LICHESS_ACTIVITIES[first]
  }

  if (LICHESS_NON_GAME.has(first)) {
    return BROWSING
  }

  if (isLichessGameId(first, LICHESS_PLAYER_ID)) {
    return LICHESS_PLAYER_LABELS[role]
  }

  return isLichessSpectatorURL(segments) ? LICHESS_GAME_LABELS[role] : BROWSING
}

export function needsGameRole(siteId: SiteId, url: string): boolean {
  const segments = pathSegments(url)

  if (siteId === 'lichess') {
    return isLichessSpectatorURL(segments) || isLichessPlayerURL(segments)
  }

  return isChesscomGameURL(segments) || isChesscomSoloPlayURL(segments)
}

export function isPlayingGame(siteId: SiteId, url: string, role: GameRole = 'unknown'): boolean {
  const segments = pathSegments(url)

  if (siteId === 'lichess') {
    if (isLichessPlayerURL(segments)) {
      return role === 'playing' || role === 'unknown'
    }

    return isLichessSpectatorURL(segments) && role === 'playing'
  }

  return (isChesscomGameURL(segments) || isChesscomSoloPlayURL(segments)) && role === 'playing'
}

export function describePresence(
  siteId: SiteId,
  url: string,
  role: GameRole = 'unknown',
): Presence {
  const { name } = SITES[siteId]
  const segments = pathSegments(url)

  return {
    details:
      siteId === 'lichess' ? lichessActivity(segments, role) : chesscomActivity(segments, role),
    state: name,
    assetKey: siteId,
    assetText: name,
  }
}
