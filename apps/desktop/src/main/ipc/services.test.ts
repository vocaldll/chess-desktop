import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  on: vi.fn(),
  openExternal: vi.fn(),
  applyVolume: vi.fn(),
  getSiteWebContents: vi.fn(),
  getLastSiteUrls: vi.fn(),
  importGameOnLichess: vi.fn(),
  rememberLichessReview: vi.fn(),
  updatePresenceLocation: vi.fn(),
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle, on: mocks.on },
  shell: { openExternal: mocks.openExternal },
}))
vi.mock('../audio', () => ({ applyVolume: mocks.applyVolume }))
vi.mock('../webview', () => ({ getSiteWebContents: mocks.getSiteWebContents }))
vi.mock('../store', () => ({ getLastSiteUrls: mocks.getLastSiteUrls }))
vi.mock('../lichess-import', () => ({ importGameOnLichess: mocks.importGameOnLichess }))
vi.mock('../lichess-review-state', () => ({ rememberLichessReview: mocks.rememberLichessReview }))
vi.mock('../discord', () => ({ updatePresenceLocation: mocks.updatePresenceLocation }))

import { IPC } from '../../shared/ipc-channels'
import { registerAudioIpc } from './audio'
import { registerLichessReviewIpc } from './lichess-review'
import { registerLinksIpc } from './links'
import { registerWebviewIpc } from './webview'

type Handler = (...args: unknown[]) => unknown

function registered(mock: typeof mocks.handle | typeof mocks.on, channel: string): Handler {
  const call = mock.mock.calls.find(([registeredChannel]) => registeredChannel === channel)
  if (!call) {
    throw new Error(`Missing handler for ${channel}`)
  }
  return call[1] as Handler
}

describe('supporting IPC services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.openExternal.mockResolvedValue(undefined)
  })

  it('routes volume updates to the active site contents', () => {
    const contents = { id: 'site' }
    mocks.getSiteWebContents.mockReturnValue(contents)
    registerAudioIpc()

    registered(mocks.on, IPC.audio.setVolume)({}, 45)

    expect(mocks.applyVolume).toHaveBeenCalledWith(contents, 45)
  })

  it('returns the persisted site URLs', () => {
    const urls = {
      chesscom: 'https://www.chess.com/home',
      lichess: 'https://lichess.org/training',
    }
    mocks.getLastSiteUrls.mockReturnValue(urls)
    registerWebviewIpc()

    expect(registered(mocks.handle, IPC.webview.getLastSiteUrls)()).toBe(urls)
  })

  it('opens the repository in the system browser', () => {
    registerLinksIpc()

    registered(mocks.on, IPC.links.openRepository)()

    expect(mocks.openExternal).toHaveBeenCalledWith('https://github.com/vocaldll/chess-desktop')
  })

  it('validates and imports review PGNs', async () => {
    const pgn = '[Event "Live Chess"]\n[Result "1-0"]\n\n1. e4 e5 1-0'
    const url = 'https://lichess.org/AbCd1234'
    mocks.importGameOnLichess.mockResolvedValue(url)
    registerLichessReviewIpc()
    const start = registered(mocks.handle, IPC.reviewOnLichess.start)

    await expect(start({}, 'invalid')).rejects.toThrow('Invalid PGN')
    await expect(start({}, pgn)).resolves.toBe(url)
    expect(mocks.rememberLichessReview).toHaveBeenCalledWith(url)
    expect(mocks.updatePresenceLocation).toHaveBeenCalledWith('lichess', url, 'reviewing')
  })
})
