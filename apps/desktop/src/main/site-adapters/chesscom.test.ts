import { describe, expect, it } from 'vitest'
import { getSiteAdapter } from '.'
import { chessComAdapter } from './chesscom'

describe('Chess.com site adapter', () => {
  it('is registered with all currently supported integrations', () => {
    expect(getSiteAdapter('chesscom')).toBe(chessComAdapter)
    expect(chessComAdapter.capabilities).toEqual({
      chatVisibility: true,
      playerAnonymity: true,
      numberedArrows: true,
      reviewOnLichess: true
    })
  })

  it('owns the selectors used by Chess.com integrations', () => {
    expect(chessComAdapter.chatHiddenCss).toContain('.resizable-chat-area-component')
    expect(chessComAdapter.gameRole.ready).toContain('wc-chess-board')
    expect(chessComAdapter.anonymity.seatPrefix).toBe('.player-')
    expect(chessComAdapter.anonymity.watchSelector).toContain(
      '[data-test-element="user-tagline-username"]'
    )
  })

  it('contains no empty selector groups', () => {
    const selectorGroups = [
      chessComAdapter.gameRole.ready,
      chessComAdapter.gameRole.player,
      chessComAdapter.anonymity.watchSelector,
      ...chessComAdapter.anonymity.rules.flatMap((rule) => rule.selectors),
      ...(chessComAdapter.anonymity.linkRules ?? []).flatMap((rule) => rule.selectors)
    ]

    expect(selectorGroups.every((selector) => selector.trim().length > 0)).toBe(true)
  })
})
