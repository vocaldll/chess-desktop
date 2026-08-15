import { describe, expect, it } from 'vitest'
import { getSiteAdapter, SITE_ADAPTERS } from '.'
import { lichessAdapter } from './lichess'

describe('Lichess site adapter', () => {
  it('is registered with the supported integration capabilities', () => {
    expect(getSiteAdapter('lichess')).toBe(lichessAdapter)
    expect(lichessAdapter.capabilities).toEqual({
      chatVisibility: true,
      playerAnonymity: true,
      numberedArrows: true,
      reviewOnLichess: false,
    })
  })

  it('owns the selectors used by Lichess integrations', () => {
    expect(lichessAdapter.chatHiddenCss).toContain('.mchat')
    expect(lichessAdapter.gameRole.ready).toContain('cg-board')
    expect(lichessAdapter.gameRole.result).toContain('.result-wrap .result')
    expect(lichessAdapter.anonymity.seatPrefix).toBe('.ruser-')
    expect(lichessAdapter.anonymity.watchSelector).toBe('a.user-link')
  })

  it('contains no empty selector groups', () => {
    const selectorGroups = [
      lichessAdapter.gameRole.ready,
      lichessAdapter.gameRole.player,
      lichessAdapter.gameRole.finished ?? '',
      lichessAdapter.gameRole.result ?? '',
      lichessAdapter.anonymity.watchSelector,
      ...lichessAdapter.anonymity.rules.flatMap((rule) => rule.selectors),
      ...(lichessAdapter.anonymity.linkRules ?? []).flatMap((rule) => rule.selectors),
    ]

    expect(selectorGroups.every((selector) => selector.trim().length > 0)).toBe(true)
  })

  it('completes the exhaustive site adapter registry', () => {
    expect(Object.keys(SITE_ADAPTERS).sort()).toEqual(['chesscom', 'lichess'])
  })
})
