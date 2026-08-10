import { JSDOM } from 'jsdom'
import { describe, expect, it, vi } from 'vitest'
import type { SiteId } from '../shared/sites'
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
        <div class="cc-user-title-component">WFM</div>
        <div data-test-element="user-tagline-username">${username}</div>
        <div class="cc-text-medium cc-user-rating-white">(1958)</div>
        <div class="connection-component connection-good"></div>
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

function chesscomChatLine(username: string, message: string): string {
  return `<div class="chat-message-component">
    <span class="user-tagline-chat-component chat-message-tagline">
      <span class="user-tagline-chat-flair"><img class="flair-rpc-component flair-rpc-small"></span>
      <a class="user-username-component user-username-link user-tagline-chat-member">${username}:</a>
    </span>
    <span class="chat-message-content">${message}</span>
  </div>`
}

function chesscomPage(
  top: string,
  bottom: string,
  self: string | null = 'TestSelf',
  chatters: readonly string[] = []
): string {
  const chat = `<div class="resizable-chat-area-component">${chatters
    .map((name) => chesscomChatLine(name, 'hi'))
    .join('')}</div>`
  const body = `${nav(self)}${player('top', top)}${player('bottom', bottom)}${chat}`
  return `<!doctype html><html><head></head><body class="board-layout with-players">${body}</body></html>`
}

function taggedChatAuthors(dom: JSDOM): string[] {
  return [
    ...dom.window.document.querySelectorAll(
      '.user-tagline-chat-component[data-chess-desktop-them] .user-username-component'
    )
  ].map((node) => (node.textContent ?? '').trim())
}

function ruser(side: 'top' | 'bottom', username: string): string {
  return `<div class="ruser-${side} ruser user-link online">
    <icon class="line"></icon>
    <a class="user-link ulpt" href="/@/${username}"><span class="utitle">IM</span><img class="uflair">${username}</a>
    <rating>2934</rating>
  </div>`
}

function metaPlayer(username: string): string {
  return `<div class="player color-icon is white text">
    <a class="user-link ulpt" href="/@/${username}"><img class="uflair">${username}<span class="rating">(1663?)</span></a>
  </div>`
}

function chatLine(username: string, message: string): string {
  return `<li><action class="reply"></action><action class="flag"></action><a class="user-link ulpt" href="/@/${username}">${username}</a><t>${message}</t></li>`
}

function lichessPage(
  top: string,
  bottom: string,
  self: string | null = 'TestSelf',
  chatters: readonly string[] = []
): string {
  const user = self ? ` data-user="${self}"` : ''
  const seats = `${ruser('top', top)}${ruser('bottom', bottom)}`
  const meta = `<div class="game__meta"><section><div class="game__meta__players">${metaPlayer(top)}${metaPlayer(bottom)}</div></section></div>`
  const cross = `<div class="crosstable"><div class="crosstable__users"><a class="user-link ulpt" href="/@/${top}">${top}</a><a class="user-link ulpt" href="/@/${bottom}">${bottom}</a></div></div>`
  const chat = `<div class="mchat"><div class="mchat__content discussion"><ol class="mchat__messages">${chatters.map((name) => chatLine(name, 'hi')).join('')}</ol></div></div>`
  return `<!doctype html><html><head></head><body${user}>${meta}<div class="round__app variant-standard">${seats}</div>${cross}${chat}</body></html>`
}

function opponentLinks(dom: JSDOM, scope: string): string[] {
  return [
    ...dom.window.document.querySelectorAll(`${scope} a.user-link[data-chess-desktop-them]`)
  ].map((node) => node.getAttribute('href') ?? '')
}

function markedLinks(dom: JSDOM): string[] {
  return [...dom.window.document.querySelectorAll('a.user-link[data-chess-desktop-me]')].map(
    (node) => node.getAttribute('href') ?? ''
  )
}

function anonymizedLinks(dom: JSDOM, scope: string): string[] {
  return [
    ...dom.window.document.querySelectorAll(`${scope} a.user-link:not([data-chess-desktop-me])`)
  ].map((node) => node.getAttribute('href') ?? '')
}

function scriptFor(siteId: SiteId, hidden: boolean): string {
  const webContents = contents()
  applyPlayerAnonymity(webContents as never, siteId, hidden)
  return webContents.executeJavaScript.mock.calls[0][0] as string
}

function cssFor(siteId: SiteId): string {
  const webContents = contents()
  applyPlayerAnonymity(webContents as never, siteId, true)
  return webContents.insertCSS.mock.calls[0][0] as string
}

function render(html: string, siteId: SiteId): JSDOM {
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true })
  dom.window.eval(scriptFor(siteId, true))
  return dom
}

function selfMarker(dom: JSDOM): string | null {
  return dom.window.document.documentElement.getAttribute(SELF_MARKER)
}

function anonymizedSeats(dom: JSDOM, siteId: SiteId, fragment: string): string[] {
  const { document } = dom.window
  const style = document.createElement('style')
  style.textContent = cssFor(siteId)
  document.head.append(style)

  const rules = [...(style.sheet?.cssRules ?? [])] as CSSStyleRule[]
  const rule = rules.find(
    (candidate) =>
      candidate.selectorText?.includes(fragment) && !candidate.selectorText.includes('::')
  )

  if (!rule) {
    throw new Error(`missing rule for ${fragment}`)
  }

  return [...document.querySelectorAll(rule.selectorText)].map((node) =>
    node.closest('.player-top, .ruser-top') ? 'top' : 'bottom'
  )
}

describe('player anonymity styling', () => {
  it.each(['chesscom', 'lichess'] as const)('inserts the %s override', async (siteId) => {
    const webContents = contents()

    applyPlayerAnonymity(webContents as never, siteId, true)

    await vi.waitFor(() => expect(webContents.insertCSS).toHaveBeenCalledOnce())
    expect(webContents.executeJavaScript).toHaveBeenCalledOnce()
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
  ])('covers %s in the Chess.com override', (fragment) => {
    expect(cssFor('chesscom')).toContain(fragment)
  })

  it.each(['.utitle', '.uflair', 'rating', 'icon.line', 'a.user-link', "content: 'Opponent'"])(
    'covers %s in the Lichess override',
    (fragment) => {
      expect(cssFor('lichess')).toContain(fragment)
    }
  )

  it('anonymizes both Chess.com players while the self marker is unset', () => {
    const dom = new JSDOM(chesscomPage('TestRival', 'TestSelf'))

    expect(anonymizedSeats(dom, 'chesscom', 'user-tagline-username')).toEqual(['top', 'bottom'])
  })

  it('anonymizes both Lichess players while the self marker is unset', () => {
    const dom = new JSDOM(lichessPage('TestRival', 'TestSelf'))

    expect(anonymizedSeats(dom, 'lichess', 'a.user-link')).toEqual(['top', 'bottom'])
  })

  it('reveals only the Chess.com seat the marker points at', () => {
    const dom = new JSDOM(chesscomPage('TestRival', 'TestSelf'))
    dom.window.document.documentElement.setAttribute(SELF_MARKER, 'bottom')

    expect(anonymizedSeats(dom, 'chesscom', 'user-tagline-username')).toEqual(['top'])
  })

  it('reveals only the Lichess seat the marker points at', () => {
    const dom = new JSDOM(lichessPage('TestRival', 'TestSelf'))
    dom.window.document.documentElement.setAttribute(SELF_MARKER, 'bottom')

    expect(anonymizedSeats(dom, 'lichess', 'a.user-link')).toEqual(['top'])
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

describe('Chess.com self detection', () => {
  it('marks the bottom seat when the board is not flipped', () => {
    expect(selfMarker(render(chesscomPage('TestRival', 'TestSelf'), 'chesscom'))).toBe('bottom')
  })

  it('resolves self from a nav nested inside the board layout', () => {
    const dom = render(chesscomPage('TestRival', 'TestSelf'), 'chesscom')

    expect(dom.window.document.body.classList.contains('board-layout')).toBe(true)
    expect(dom.window.document.querySelector('.board-layout-nav nav')).not.toBeNull()
    expect(selfMarker(dom)).toBe('bottom')
  })

  it('marks the top seat when the board is flipped', () => {
    expect(selfMarker(render(chesscomPage('TestSelf', 'TestRival'), 'chesscom'))).toBe('top')
  })

  it('matches the username regardless of case', () => {
    expect(selfMarker(render(chesscomPage('TestRival', 'testself'), 'chesscom'))).toBe('bottom')
  })

  it('leaves both anonymized when the visitor is logged out', () => {
    expect(
      selfMarker(render(chesscomPage('TestRival', 'TestStranger', null), 'chesscom'))
    ).toBeNull()
  })

  it('leaves both anonymized while spectating strangers', () => {
    expect(selfMarker(render(chesscomPage('TestRival', 'TestStranger'), 'chesscom'))).toBeNull()
  })

  it('ignores a username that appears in both seats', () => {
    expect(selfMarker(render(chesscomPage('TestSelf', 'TestSelf'), 'chesscom'))).toBeNull()
  })

  it('re-resolves the seat after a rematch swaps colors', async () => {
    const dom = render(chesscomPage('TestRival', 'TestSelf'), 'chesscom')
    expect(selfMarker(dom)).toBe('bottom')

    const { document } = dom.window
    const top = document.querySelector('.player-top [data-test-element]')
    const bottom = document.querySelector('.player-bottom [data-test-element]')

    if (!top || !bottom) {
      throw new Error('missing taglines')
    }

    top.textContent = 'TestSelf'
    bottom.textContent = 'TestRival'

    await vi.waitFor(() => expect(selfMarker(dom)).toBe('top'))
  })

  it('clears the marker when the setting is turned off', () => {
    const dom = render(chesscomPage('TestRival', 'TestSelf'), 'chesscom')
    expect(selfMarker(dom)).toBe('bottom')

    dom.window.eval(scriptFor('chesscom', false))

    expect(selfMarker(dom)).toBeNull()
  })
})

describe('Lichess self detection', () => {
  it('marks the bottom seat when the board is not flipped', () => {
    expect(selfMarker(render(lichessPage('TestRival', 'TestSelf'), 'lichess'))).toBe('bottom')
  })

  it('marks the top seat when the board is flipped', () => {
    expect(selfMarker(render(lichessPage('TestSelf', 'TestRival'), 'lichess'))).toBe('top')
  })

  it('matches the username regardless of case', () => {
    expect(selfMarker(render(lichessPage('TestRival', 'testself'), 'lichess'))).toBe('bottom')
  })

  it('reads the seat from the profile link rather than the visible text', () => {
    const dom = render(lichessPage('TestRival', 'TestSelf'), 'lichess')
    const link = dom.window.document.querySelector('.ruser-bottom a.user-link')

    expect(link?.getAttribute('href')).toBe('/@/TestSelf')
    expect(link?.textContent).toContain('IM')
    expect(selfMarker(dom)).toBe('bottom')
  })

  it('leaves both anonymized when the visitor is logged out', () => {
    expect(selfMarker(render(lichessPage('TestRival', 'TestStranger', null), 'lichess'))).toBeNull()
  })

  it('leaves both anonymized while spectating strangers', () => {
    expect(selfMarker(render(lichessPage('TestRival', 'TestStranger'), 'lichess'))).toBeNull()
  })

  it('clears the marker when the setting is turned off', () => {
    const dom = render(lichessPage('TestRival', 'TestSelf'), 'lichess')
    expect(selfMarker(dom)).toBe('bottom')

    dom.window.eval(scriptFor('lichess', false))

    expect(selfMarker(dom)).toBeNull()
  })
})

describe('Lichess name surfaces outside the seats', () => {
  it.each(['.game__meta', '.crosstable'])('anonymizes the opponent inside %s', (scope) => {
    const dom = render(lichessPage('TestRival', 'TestSelf'), 'lichess')

    expect(anonymizedLinks(dom, scope)).toEqual(['/@/TestRival'])
  })

  it('tags every link belonging to the viewer', () => {
    const dom = render(lichessPage('TestRival', 'TestSelf'), 'lichess')

    expect(markedLinks(dom)).toEqual(['/@/TestSelf', '/@/TestSelf', '/@/TestSelf'])
  })

  it('anonymizes every link when the viewer cannot be resolved', () => {
    const dom = render(lichessPage('TestRival', 'TestStranger', null), 'lichess')

    expect(markedLinks(dom)).toEqual([])
    expect(anonymizedLinks(dom, '.game__meta')).toEqual(['/@/TestRival', '/@/TestStranger'])
  })

  it('covers the scoped link selectors in the override', () => {
    const css = cssFor('lichess')

    expect(css).toContain('.game__meta a.user-link:not([data-chess-desktop-me])')
    expect(css).toContain('.crosstable a.user-link:not([data-chess-desktop-me])')
    expect(css).toContain('font-size: 0.9rem;')
    expect(css).toContain('font-size: 1rem;')
  })

  it('untags the viewer links when the setting is turned off', () => {
    const dom = render(lichessPage('TestRival', 'TestSelf'), 'lichess')
    expect(markedLinks(dom)).not.toEqual([])

    dom.window.eval(scriptFor('lichess', false))

    expect(markedLinks(dom)).toEqual([])
  })

  it('leaves Chess.com links untouched', () => {
    const dom = render(chesscomPage('TestRival', 'TestSelf'), 'chesscom')

    expect(markedLinks(dom)).toEqual([])
    expect(cssFor('chesscom')).not.toContain('data-chess-desktop-me')
  })
})

describe('Chess.com chat authorship', () => {
  const chatters = ['TestRival', 'TestSelf', 'TestWatcher']

  it('tags only the opponent, matching past the trailing colon', () => {
    const dom = render(chesscomPage('TestRival', 'TestSelf', 'TestSelf', chatters), 'chesscom')

    expect(taggedChatAuthors(dom)).toEqual(['TestRival:'])
  })

  it('leaves unrelated chatters named', () => {
    const dom = render(chesscomPage('TestRival', 'TestSelf', 'TestSelf', chatters), 'chesscom')
    const authors = [
      ...dom.window.document.querySelectorAll(
        '.user-tagline-chat-component:not([data-chess-desktop-them]) .user-username-component'
      )
    ].map((node) => (node.textContent ?? '').trim())

    expect(authors).toEqual(['TestSelf:', 'TestWatcher:'])
  })

  it('tags nobody while spectating', () => {
    const dom = render(chesscomPage('TestRival', 'TestStranger', 'TestSelf', chatters), 'chesscom')

    expect(taggedChatAuthors(dom)).toEqual([])
  })

  it('follows the opponent when the board is flipped', () => {
    const dom = render(chesscomPage('TestSelf', 'TestRival', 'TestSelf', chatters), 'chesscom')

    expect(selfMarker(dom)).toBe('top')
    expect(taggedChatAuthors(dom)).toEqual(['TestRival:'])
  })

  it('untags the opponent when the setting is turned off', () => {
    const dom = render(chesscomPage('TestRival', 'TestSelf', 'TestSelf', chatters), 'chesscom')
    expect(taggedChatAuthors(dom)).not.toEqual([])

    dom.window.eval(scriptFor('chesscom', false))

    expect(taggedChatAuthors(dom)).toEqual([])
  })

  it('replaces the author with a colon so it matches the native format', () => {
    const css = cssFor('chesscom')

    expect(css).toContain('.user-tagline-chat-component[data-chess-desktop-them]')
    expect(css).toContain("content: 'Opponent:';")
    expect(css).toContain('.user-tagline-chat-flair')
  })
})

describe('Lichess chat authorship', () => {
  const chatters = ['TestRival', 'TestSelf', 'TestWatcher']

  it('tags only the opponent in the chat', () => {
    const dom = render(lichessPage('TestRival', 'TestSelf', 'TestSelf', chatters), 'lichess')

    expect(opponentLinks(dom, '.mchat')).toEqual(['/@/TestRival'])
  })

  it('leaves unrelated spectators named', () => {
    const dom = render(lichessPage('TestRival', 'TestSelf', 'TestSelf', chatters), 'lichess')
    const watcher = dom.window.document.querySelector('.mchat a[href="/@/TestWatcher"]')

    expect(watcher?.hasAttribute('data-chess-desktop-them')).toBe(false)
    expect(watcher?.hasAttribute('data-chess-desktop-me')).toBe(false)
  })

  it('tags nobody in the chat while spectating', () => {
    const dom = render(
      lichessPage('TestRival', 'TestStranger', 'TestSelf', ['TestRival', 'TestStranger']),
      'lichess'
    )

    expect(opponentLinks(dom, '.mchat')).toEqual([])
  })

  it('follows the opponent when the board is flipped', () => {
    const dom = render(lichessPage('TestSelf', 'TestRival', 'TestSelf', chatters), 'lichess')

    expect(selfMarker(dom)).toBe('top')
    expect(opponentLinks(dom, '.mchat')).toEqual(['/@/TestRival'])
  })

  it('untags the opponent when the setting is turned off', () => {
    const dom = render(lichessPage('TestRival', 'TestSelf', 'TestSelf', chatters), 'lichess')
    expect(opponentLinks(dom, '.mchat')).not.toEqual([])

    dom.window.eval(scriptFor('lichess', false))

    expect(opponentLinks(dom, '.mchat')).toEqual([])
  })

  it('scopes the chat rule to the opponent rather than every stranger', () => {
    const css = cssFor('lichess')

    expect(css).toContain('.mchat a.user-link[data-chess-desktop-them]')
    expect(css).not.toContain('.mchat a.user-link:not(')
  })
})
