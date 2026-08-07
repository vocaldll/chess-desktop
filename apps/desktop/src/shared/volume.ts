export const MIN_VOLUME = 0

export const MAX_VOLUME = 100

export const DEFAULT_VOLUME = 100

export function isVolumePercent(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_VOLUME &&
    value <= MAX_VOLUME
  )
}
