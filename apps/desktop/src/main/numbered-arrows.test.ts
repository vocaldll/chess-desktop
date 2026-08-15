import { describe, expect, it, vi } from 'vitest'
import { NUMBERED_ARROWS_UPDATE_CHANNEL } from '../shared/numbered-arrows'
import { applyNumberedArrows } from './numbered-arrows'

function contents(destroyed = false) {
  return {
    isDestroyed: vi.fn().mockReturnValue(destroyed),
    send: vi.fn(),
  }
}

describe('numbered arrows', () => {
  it('sends the current site and setting to the guest webview', () => {
    const webContents = contents()

    applyNumberedArrows(webContents as never, 'lichess', true)

    expect(webContents.send).toHaveBeenCalledWith(NUMBERED_ARROWS_UPDATE_CHANNEL, {
      enabled: true,
      siteId: 'lichess',
    })
  })

  it('does not send to missing or destroyed web contents', () => {
    const webContents = contents(true)

    applyNumberedArrows(null, 'chesscom', true)
    applyNumberedArrows(webContents as never, 'chesscom', true)

    expect(webContents.send).not.toHaveBeenCalled()
  })
})
