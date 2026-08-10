import { beforeEach, describe, expect, it, vi } from 'vitest'

const installMasterGain = vi.hoisted(() => vi.fn())
const electron = vi.hoisted(() => ({
  on: vi.fn(),
  sendToHost: vi.fn()
}))

vi.mock('./audio', () => ({ installMasterGain }))
vi.mock('electron', () => ({
  ipcRenderer: {
    on: electron.on,
    sendToHost: electron.sendToHost
  }
}))

await import('./webview')

describe('guest webview preload', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    electron.sendToHost.mockClear()
    document.body.innerHTML = ''
    history.replaceState({}, '', '/')
  })

  it('installs master volume handling', () => {
    expect(installMasterGain).toHaveBeenCalledOnce()
  })

  it.each([
    [3, 'back'],
    [4, 'forward']
  ])('routes mouse button %i to history.%s', (button, direction) => {
    const navigate = vi.spyOn(history, direction as 'back' | 'forward').mockImplementation(() => {})
    const event = new MouseEvent('mouseup', { button, cancelable: true })
    const preventDefault = vi.spyOn(event, 'preventDefault')

    window.dispatchEvent(event)

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledOnce()
  })

  it('ignores ordinary mouse buttons', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {})
    const forward = vi.spyOn(history, 'forward').mockImplementation(() => {})

    window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }))

    expect(back).not.toHaveBeenCalled()
    expect(forward).not.toHaveBeenCalled()
  })

  it('reads the current Chess.com PGN through the share dialog', async () => {
    history.replaceState({}, '', '/game/live/123')
    const pgn = '[Event "Live Chess"]\n[Result "1-0"]\n\n1. e4 e5 1-0'
    document.body.innerHTML = `
      <button data-chess-desktop-review-on-lichess
        data-chess-desktop-game-url="https://www.chess.com/game/live/123">Review on Lichess</button>
      <button aria-label="Share">Share</button>
    `
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Share"]')
      ?.addEventListener('click', () => {
        const modal = document.createElement('div')
        modal.id = 'share-modal'
        modal.innerHTML = `<dialog open><div pgn="${pgn.replaceAll('"', '&quot;')}"></div><button aria-label="Close"></button></dialog>`
        document.body.append(modal)
      })

    document.querySelector<HTMLButtonElement>('[data-chess-desktop-review-on-lichess]')?.click()

    await vi.waitFor(() => {
      expect(electron.sendToHost).toHaveBeenCalledWith('review-on-lichess', pgn)
    })
  })

  it('restores the review button when the hidden import fails', async () => {
    history.replaceState({}, '', '/game/live/123')
    const pgn = '[Event "Live Chess"]\n[Result "1-0"]\n\n1. e4 e5 1-0'
    document.body.innerHTML = `
      <button data-chess-desktop-review-on-lichess
        data-chess-desktop-game-url="http://localhost:3000/game/live/123">Review on Lichess</button>
      <button aria-label="Share">Share</button>
    `
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Share"]')
      ?.addEventListener('click', () => {
        const modal = document.createElement('div')
        modal.id = 'share-modal'
        modal.innerHTML = `<dialog open><div pgn="${pgn.replaceAll('"', '&quot;')}"></div></dialog>`
        document.body.append(modal)
      })

    const button = document.querySelector<HTMLButtonElement>(
      '[data-chess-desktop-review-on-lichess]'
    ) as HTMLButtonElement
    button.click()

    await vi.waitFor(() => expect(button.disabled).toBe(true))
    const failureHandler = electron.on.mock.calls.find(
      ([channel]) => channel === 'review-on-lichess-failed'
    )?.[1]
    expect(failureHandler).toBeTypeOf('function')
    failureHandler()

    expect(button.disabled).toBe(false)
    expect(button.textContent).toBe('Review on Lichess')
    expect(button.title).toBe('Lichess could not import this game. Try again.')
  })
})
