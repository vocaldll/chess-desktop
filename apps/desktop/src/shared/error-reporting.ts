import type { Event } from '@sentry/electron/main'

const GUEST_ORIGINS = new Set(['https://www.chess.com', 'https://chess.com', 'https://lichess.org'])
const URL_PATTERN = /(?:https?|file):\/\/[^\s"'<>)}\]]+/gi

function redactUrls(value: string): string {
  return value.replace(URL_PATTERN, (match) => {
    if (match.toLowerCase().startsWith('file:')) {
      return 'file:///[redacted]'
    }

    try {
      return `${new URL(match).origin}/[redacted]`
    } catch {
      return '[redacted-url]'
    }
  })
}

function sanitizeContextValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactUrls(value)
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeContextValue)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !key.toLowerCase().includes('url'))
        .map(([key, nestedValue]) => [key, sanitizeContextValue(nestedValue)])
    )
  }

  return value
}

export function isGuestPage(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false
  }

  try {
    return GUEST_ORIGINS.has(new URL(value).origin)
  } catch {
    return false
  }
}

export function sanitizeErrorEvent<T extends Event>(event: T): T | null {
  const electronContext = event.contexts?.electron
  const crashedUrl = electronContext?.crashed_url

  if (event.platform === 'native' && isGuestPage(crashedUrl)) {
    return null
  }

  delete event.user
  delete event.request
  delete event.server_name
  delete event.breadcrumbs
  delete event.extra
  delete event.transaction

  if (event.message) {
    event.message = redactUrls(event.message)
  }

  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((exception) => ({
      ...exception,
      value: exception.value ? redactUrls(exception.value) : exception.value
    }))
  }

  if (event.tags) {
    event.tags = Object.fromEntries(
      Object.entries(event.tags).map(([key, value]) => [
        key,
        typeof value === 'string' ? redactUrls(value) : value
      ])
    )
  }

  if (event.contexts) {
    event.contexts = sanitizeContextValue(event.contexts) as typeof event.contexts
  }

  return event
}
