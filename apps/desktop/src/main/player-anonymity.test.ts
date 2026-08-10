import { JSDOM } from 'jsdom'
import { describe, expect, it, vi } from 'vitest'
import { applyPlayerAnonymity } from './player-anonymity'

const SELF_MARKER = 'data-chess-desktop-self'

function contents(key = 'style-key') {
  return {
    isDestroyed: vi.fn().mockReturnValue(false),
    insertCSS: vi.fn().mockResolvedValue(key),
    removeInsertedCSS: vi.fn().mockResolvedValue(undefined),
    executeJavaScript: vi.fn().mockResolvedValue(undefined)
  }
}

function player(side: 'top' | 'bottom', username: string): string {
  return `<div class="board-layout-${side}">
    <div class="player-component player-${side}">
      <div class="player-avatar"><div class="cc-avatar-component">
        <img class="cc-avatar-img" alt="Avatar of ${username}">
      </div></div>
      <div class="player-tagline">
        <div data-test-element="user-tagline-username">${username}</div>
        <div class="cc-text-medium cc-user-rating-white">(1958)</div>
      </div>
    </div>
  </div>`
}

function nav(self: string | null): string {
  const link = self
    ? `<a class="sidebar-link" href="https://www.chess.com/member/${self}">${self}</a>`
    : ''

  return `<div class="board-layout-nav"><nav class="sidebar-container">${link}</nav></div>`
}

function page(top: string, bottom: string, self: string | null = 'TestSelf'): string {
  const body = `${nav(self)}${player('top', top)}${player('bottom', bottom)}`
  return `<!doctype html><html><head></head><body class="board-layout with-players">${body}</body></html>`
}

function scriptFor(hidden: boolean): string {
  const webContents = contents()
  applyPlayerAnonymity(webContents as never, 'chesscom', hidden)
  return webContents.executeJavaScript.mock.calls[0][0] as string
}

function cssForChesscom(): string {
  const webContents = contents()
  applyPlayerAnonymity(webContents as never, 'chesscom', true)
  return webContents.insertCSS.mock.calls[0][0] as string
}

function render(html: string, script = scriptFor(true)): JSDOM {
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true })
  dom.window.eval(script)
  return dom
}

function setTagline(dom: JSDOM, side: 'top' | 'bottom', username: string): void {
  const node = dom.window.document.querySelector(`.player-${side} [data-test-element]`)

  if (!node) {
    throw new Error(`missing ${side} tagline`)
  }

  node.textContent = username
}

function selfMarker(dom: JSDOM): string | null {
  return dom.window.document.documentElement.getAttribute(SELF_MARKER)
}

function anonymizedNames(dom: JSDOM): string[] {
  const { document } = dom.window
  const style = document.createElement('style')
  style.textContent = cssForChesscom()
  document.head.append(style)

  const rules = [...(style.sheet?.cssRules ?? [])] as CSSStyleRule[]
  const rule = rules.find(
    (candidate) =>
      candidate.selectorText?.includes('user-tagline-username') &&
      !candidate.selectorText.includes('::')
  )

  if (!rule) {
    throw new Error('missing username rule')
  }

  return [...document.querySelectorAll(rule.selectorText)].map((node) => node.textContent ?? '')
}

describe('player anonymity styling', () => {
  it('inserts the Chess.com override and skips Lichess for now', async () => {
    const chesscom = contents()
    const lichess = contents()

    applyPlayerAnonymity(chesscom as never, 'chesscom', true)
    applyPlayerAnonymity(lichess as never, 'lichess', true)

    await vi.waitFor(() => expect(chesscom.insertCSS).toHaveBeenCalledOnce())
    expect(chesscom.insertCSS.mock.calls[0][0]).toContain('user-tagline-username')
    expect(lichess.insertCSS).not.toHaveBeenCalled()
    expect(lichess.executeJavaScript).not.toHaveBeenCalled()
  })

  it('anonymizes both players while the self marker is unset', () => {
    const dom = new JSDOM(page('TestRival', 'TestSelf'))

    expect(anonymizedNames(dom)).toEqual(['TestRival', 'TestSelf'])
  })

  it('reveals only the side the marker points at', () => {
    const dom = new JSDOM(page('TestRival', 'TestSelf'))
    dom.window.document.documentElement.setAttribute(SELF_MARKER, 'bottom')

    expect(anonymizedNames(dom)).toEqual(['TestRival'])
  })

  it.each([
    'cc-user-rating',
    '.rating-score-component',
    '.connection-component',
    '.cc-user-title-component',
    '.cc-country-flag-component',
    '.flair-rpc-component',
    '.cc-user-badge-component',
    '.cc-avatar-img',
    'bundles/web/images/black_400.png',
    "content: 'Opponent'"
  ])('covers %s in the opponent override', (fragment) => {
    expect(cssForChesscom()).toContain(fragment)
  })

  it('removes the inserted override when the opponent is shown', async () => {
    const webContents = contents()

    applyPlayerAnonymity(webContents as never, 'chesscom', true)
    await vi.waitFor(() => expect(webContents.insertCSS).toHaveBeenCalledOnce())

    applyPlayerAnonymity(webContents as never, 'chesscom', false)

    expect(webContents.removeInsertedCSS).toHaveBeenCalledWith('style-key')
    expect(webContents.executeJavaScript.mock.calls[1][0]).toContain('(false)')
  })

  it('does not reinsert an unchanged override unless refreshed', async () => {
    const webContents = contents()

    applyPlayerAnonymity(webContents as never, 'chesscom', true)
    await vi.waitFor(() => expect(webContents.insertCSS).toHaveBeenCalledOnce())

    applyPlayerAnonymity(webContents as never, 'chesscom', true)
    expect(webContents.insertCSS).toHaveBeenCalledOnce()

    applyPlayerAnonymity(webContents as never, 'chesscom', true, true)
    expect(webContents.insertCSS).toHaveBeenCalledTimes(2)
  })

  it('does not touch destroyed web contents', () => {
    const webContents = contents()
    webContents.isDestroyed.mockReturnValue(true)

    applyPlayerAnonymity(webContents as never, 'chesscom', true)

    expect(webContents.insertCSS).not.toHaveBeenCalled()
    expect(webContents.executeJavaScript).not.toHaveBeenCalled()
  })
})

describe('self detection', () => {
  it('marks the bottom seat when the board is not flipped', () => {
    expect(selfMarker(render(page('TestRival', 'TestSelf')))).toBe('bottom')
  })

  it('resolves self from a nav nested inside the board layout', () => {
    const dom = render(page('TestRival', 'TestSelf'))

    expect(dom.window.document.body.classList.contains('board-layout')).toBe(true)
    expect(dom.window.document.querySelector('.board-layout-nav nav')).not.toBeNull()
    expect(selfMarker(dom)).toBe('bottom')
  })

  it('marks the top seat when the board is flipped', () => {
    expect(selfMarker(render(page('TestSelf', 'TestRival')))).toBe('top')
  })

  it('matches the username regardless of case', () => {
    expect(selfMarker(render(page('TestRival', 'testself')))).toBe('bottom')
  })

  it('leaves both anonymized when the visitor is logged out', () => {
    expect(selfMarker(render(page('TestRival', 'TestStranger', null)))).toBeNull()
  })

  it('leaves both anonymized while spectating strangers', () => {
    expect(selfMarker(render(page('TestRival', 'TestStranger')))).toBeNull()
  })

  it('ignores a username that appears in both seats', () => {
    expect(selfMarker(render(page('TestSelf', 'TestSelf')))).toBeNull()
  })

  it('re-resolves the seat after a rematch swaps colors', async () => {
    const dom = render(page('TestRival', 'TestSelf'))
    expect(selfMarker(dom)).toBe('bottom')

    setTagline(dom, 'top', 'TestSelf')
    setTagline(dom, 'bottom', 'TestRival')

    await vi.waitFor(() => expect(selfMarker(dom)).toBe('top'))
  })

  it('clears the marker when the setting is turned off', () => {
    const dom = render(page('TestRival', 'TestSelf'))
    expect(selfMarker(dom)).toBe('bottom')

    dom.window.eval(scriptFor(false))

    expect(selfMarker(dom)).toBeNull()
  })
})
