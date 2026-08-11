import { describe, expect, it } from 'vitest'
import { isGuestPage, sanitizeErrorEvent } from './error-reporting'

describe('error event privacy', () => {
  it.each([
    'https://www.chess.com/game/live/123',
    'https://chess.com/member/example',
    'https://lichess.org/abcdefgh'
  ])('recognizes guest page %s', (url) => {
    expect(isGuestPage(url)).toBe(true)
  })

  it.each(['file:///app/index.html', 'https://github.com/vocaldll/chess-desktop', 'invalid'])(
    'does not classify %s as a guest page',
    (url) => {
      expect(isGuestPage(url)).toBe(false)
    }
  )

  it('drops native crashes from embedded chess pages', () => {
    expect(
      sanitizeErrorEvent({
        platform: 'native',
        contexts: { electron: { crashed_url: 'https://lichess.org/abcdefgh' } }
      })
    ).toBeNull()
  })

  it('removes identity, navigation, and interaction data', () => {
    const event = sanitizeErrorEvent({
      message: 'Failed at https://www.chess.com/game/live/123?token=secret',
      transaction: 'https://lichess.org/@/example',
      user: { id: 'player' },
      request: { url: 'https://lichess.org/abcdefgh' },
      server_name: 'personal-computer',
      breadcrumbs: [{ category: 'ui.click', message: 'button' }],
      extra: { pgn: 'private game' },
      tags: { source: 'https://lichess.org/abcdefgh' },
      exception: {
        values: [{ type: 'Error', value: 'Loaded file:///C:/Users/Example/state.json' }]
      },
      contexts: {
        electron: {
          crashed_url: 'file:///C:/Users/Example/app/index.html',
          process_type: 'renderer',
          diagnostics: {
            source_url: 'https://lichess.org/abcdefgh',
            note: 'Opened https://www.chess.com/game/live/123'
          }
        }
      }
    })

    expect(event).toMatchObject({
      message: 'Failed at https://www.chess.com/[redacted]',
      tags: { source: 'https://lichess.org/[redacted]' },
      exception: { values: [{ value: 'Loaded file:///[redacted]' }] },
      contexts: {
        electron: {
          process_type: 'renderer',
          diagnostics: { note: 'Opened https://www.chess.com/[redacted]' }
        }
      }
    })
    expect(event).not.toHaveProperty('user')
    expect(event).not.toHaveProperty('request')
    expect(event).not.toHaveProperty('server_name')
    expect(event).not.toHaveProperty('breadcrumbs')
    expect(event).not.toHaveProperty('extra')
    expect(event).not.toHaveProperty('transaction')
    expect(event?.contexts?.electron).not.toHaveProperty('crashed_url')
    expect(event?.contexts?.electron?.diagnostics).not.toHaveProperty('source_url')
  })
})
