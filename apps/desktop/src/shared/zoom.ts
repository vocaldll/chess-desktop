import { SITE_ORDER, type SiteId } from './sites'

export const ZOOM_STEPS: readonly number[] = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200]

export const DEFAULT_ZOOM = 100

export type SiteZoom = Record<SiteId, number>

export function isZoomPercent(value: unknown): value is number {
  return typeof value === 'number' && ZOOM_STEPS.includes(value)
}

export function isSiteZoom(value: unknown): value is SiteZoom {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const source = value as Record<string, unknown>
  return SITE_ORDER.every((id) => isZoomPercent(source[id]))
}

export function coerceSiteZoom(raw: unknown): SiteZoom {
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const result = {} as SiteZoom

  for (const id of SITE_ORDER) {
    const value = source[id]
    result[id] = isZoomPercent(value) ? value : DEFAULT_ZOOM
  }

  return result
}

export function stepZoom(current: number, direction: 1 | -1): number {
  const index = ZOOM_STEPS.indexOf(current)
  const from = index === -1 ? ZOOM_STEPS.indexOf(DEFAULT_ZOOM) : index
  const next = Math.min(Math.max(from + direction, 0), ZOOM_STEPS.length - 1)

  return ZOOM_STEPS[next]
}

export function toZoomFactor(percent: number): number {
  return percent / 100
}
