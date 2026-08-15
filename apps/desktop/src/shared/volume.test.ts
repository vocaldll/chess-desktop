import { describe, expect, it } from 'vitest'
import { isVolumePercent } from './volume'

describe('volume validation', () => {
  it.each([0, 1, 50, 99, 100])('accepts %d percent', (value) => {
    expect(isVolumePercent(value)).toBe(true)
  })

  it.each([-1, 101, 0.5, Number.NaN, Number.POSITIVE_INFINITY, '50', null])(
    'rejects %j',
    (value) => {
      expect(isVolumePercent(value)).toBe(false)
    },
  )
})
