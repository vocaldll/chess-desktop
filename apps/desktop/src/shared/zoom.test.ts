import { describe, expect, it } from 'vitest'
import {
  coerceSiteZoom,
  DEFAULT_ZOOM,
  isSiteZoom,
  isZoomPercent,
  stepZoom,
  toZoomFactor,
  ZOOM_STEPS,
} from './zoom'

describe('zoom validation', () => {
  it.each(ZOOM_STEPS)('accepts supported zoom %d', (value) => {
    expect(isZoomPercent(value)).toBe(true)
  })

  it.each([0, 49, 68, 201, 100.5, '100', null])('rejects unsupported zoom %j', (value) => {
    expect(isZoomPercent(value)).toBe(false)
  })

  it('requires a valid zoom for every site', () => {
    expect(isSiteZoom({ chesscom: 90, lichess: 125 })).toBe(true)
    expect(isSiteZoom({ chesscom: 90 })).toBe(false)
    expect(isSiteZoom({ chesscom: 90, lichess: 123 })).toBe(false)
    expect(isSiteZoom(null)).toBe(false)
  })
})

describe('zoom coercion', () => {
  it('preserves valid values and defaults invalid values independently', () => {
    expect(coerceSiteZoom({ chesscom: 75, lichess: 123 })).toEqual({
      chesscom: 75,
      lichess: DEFAULT_ZOOM,
    })
  })

  it.each([null, undefined, [], '100'])('returns defaults for %j', (value) => {
    expect(coerceSiteZoom(value)).toEqual({ chesscom: DEFAULT_ZOOM, lichess: DEFAULT_ZOOM })
  })
})

describe('zoom stepping', () => {
  it('steps in both directions', () => {
    expect(stepZoom(100, 1)).toBe(110)
    expect(stepZoom(100, -1)).toBe(90)
  })

  it('clamps at both boundaries', () => {
    expect(stepZoom(ZOOM_STEPS[0], -1)).toBe(ZOOM_STEPS[0])
    expect(stepZoom(ZOOM_STEPS.at(-1) as number, 1)).toBe(ZOOM_STEPS.at(-1))
  })

  it('uses the default as the base for unsupported current values', () => {
    expect(stepZoom(123, 1)).toBe(110)
    expect(stepZoom(123, -1)).toBe(90)
  })

  it('converts percentages to Electron zoom factors', () => {
    expect(toZoomFactor(50)).toBe(0.5)
    expect(toZoomFactor(125)).toBe(1.25)
  })
})
