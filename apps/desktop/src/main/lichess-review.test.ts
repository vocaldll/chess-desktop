// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { installReviewButtons, removeReviewButtons } from './lichess-review'

describe('Chess.com Lichess review buttons', () => {
  afterEach(() => {
    removeReviewButtons()
    document.body.innerHTML = ''
  })

  it('adds full and compact actions beside review buttons', () => {
    document.body.innerHTML = `
      <a class="cc-button-component cc-button-primary" aria-label="Game Review"
        href="/analysis/game/live/123?tab=review">Game Review</a>
      <a class="cc-button-component game-accuracy-review-button"
        href="/analysis/game/daily/456?flip=true">Review</a>
      <a class="quick-analysis-tally-component" aria-label="Game Review"
        href="/analysis/game/live/789?tab=review">Stats</a>
    `

    installReviewButtons()

    const buttons = document.querySelectorAll<HTMLButtonElement>(
      '[data-chess-desktop-review-on-lichess]'
    )
    expect(buttons).toHaveLength(2)
    expect(buttons[0].textContent).toBe('Review on Lichess')
    expect(buttons[0].getAttribute('data-chess-desktop-game-url')).toBe(
      'http://localhost:3000/game/live/123'
    )
    expect(buttons[1].textContent).toBe('Lichess')
    expect(buttons[1].getAttribute('data-chess-desktop-game-url')).toBe(
      'http://localhost:3000/game/daily/456'
    )
  })

  it('observes dynamically rendered review buttons without duplicating actions', async () => {
    installReviewButtons()
    installReviewButtons()

    document.body.insertAdjacentHTML(
      'beforeend',
      '<a class="cc-button-component" aria-label="Game Review" href="/analysis/game/live/123">Review</a>'
    )

    await vi.waitFor(() => {
      expect(document.querySelectorAll('[data-chess-desktop-review-on-lichess]')).toHaveLength(1)
    })
  })
})
