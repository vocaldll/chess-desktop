import { describe, expect, it } from 'vitest'
import { isLichessReview, rememberLichessReview } from './lichess-review-state'

const reviewUrl = 'https://lichess.org/Ab12Cd34'

describe('Lichess review state', () => {
  it('recognizes an imported game without modifying its URL', () => {
    rememberLichessReview(reviewUrl)

    expect(isLichessReview(reviewUrl)).toBe(true)
    expect(new URL(reviewUrl).search).toBe('')
  })

  it('keeps a pending review through an intermediate Lichess page', () => {
    rememberLichessReview(reviewUrl)

    expect(isLichessReview('https://lichess.org/')).toBe(false)
    expect(isLichessReview(reviewUrl)).toBe(true)
  })

  it('forgets a review after leaving its board', () => {
    rememberLichessReview(reviewUrl)
    expect(isLichessReview(reviewUrl)).toBe(true)

    expect(isLichessReview('https://lichess.org/analysis')).toBe(false)
    expect(isLichessReview(reviewUrl)).toBe(false)
  })
})
