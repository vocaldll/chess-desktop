import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC } from '../shared/ipc-channels'
import { isActiveGame, updateActiveGameState } from './active-game'

describe('active game', () => {
  beforeEach(() => {
    updateActiveGameState(null, false)
  })

  it('publishes active-game changes once', () => {
    const window = { webContents: { send: vi.fn() } }

    updateActiveGameState(window as never, true)
    updateActiveGameState(window as never, true)

    expect(isActiveGame()).toBe(true)
    expect(window.webContents.send).toHaveBeenCalledOnce()
    expect(window.webContents.send).toHaveBeenCalledWith(IPC.activeGame.playingChanged, true)
  })
})
