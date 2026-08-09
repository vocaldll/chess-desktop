import { describe, expect, it, vi } from 'vitest'
import { applyChatVisibility } from './chat-visibility'

function contents(key = 'style-key') {
  return {
    isDestroyed: vi.fn().mockReturnValue(false),
    insertCSS: vi.fn().mockResolvedValue(key),
    removeInsertedCSS: vi.fn().mockResolvedValue(undefined)
  }
}

describe('chat visibility', () => {
  it.each([
    ['chesscom', '.resizable-chat-area-component'],
    ['lichess', '.mchat']
  ] as const)('inserts the %s chat override', async (siteId, selector) => {
    const webContents = contents()

    applyChatVisibility(webContents as never, siteId, true)

    await vi.waitFor(() => expect(webContents.insertCSS).toHaveBeenCalledOnce())
    expect(webContents.insertCSS.mock.calls[0][0]).toContain(selector)
  })

  it('also hides the Chess.com chat tab', () => {
    const webContents = contents()

    applyChatVisibility(webContents as never, 'chesscom', true)

    expect(webContents.insertCSS.mock.calls[0][0]).toContain('[data-tab="GameViewTab.Chat"]')
  })

  it('removes the inserted override when chat is shown', async () => {
    const webContents = contents()

    applyChatVisibility(webContents as never, 'chesscom', true)
    await vi.waitFor(() => expect(webContents.insertCSS).toHaveBeenCalledOnce())

    applyChatVisibility(webContents as never, 'chesscom', false)

    expect(webContents.removeInsertedCSS).toHaveBeenCalledWith('style-key')
  })

  it('does not reinsert an unchanged override unless refreshed', async () => {
    const webContents = contents()

    applyChatVisibility(webContents as never, 'chesscom', true)
    await vi.waitFor(() => expect(webContents.insertCSS).toHaveBeenCalledOnce())

    applyChatVisibility(webContents as never, 'chesscom', true)
    expect(webContents.insertCSS).toHaveBeenCalledOnce()

    applyChatVisibility(webContents as never, 'chesscom', true, true)
    expect(webContents.insertCSS).toHaveBeenCalledTimes(2)
    expect(webContents.removeInsertedCSS).toHaveBeenCalledWith('style-key')
  })

  it('does not touch destroyed web contents', () => {
    const webContents = contents()
    webContents.isDestroyed.mockReturnValue(true)

    applyChatVisibility(webContents as never, 'lichess', true)

    expect(webContents.insertCSS).not.toHaveBeenCalled()
  })
})
