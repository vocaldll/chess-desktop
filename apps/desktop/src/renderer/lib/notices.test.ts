import { beforeEach, describe, expect, it } from 'vitest'
import { notices } from './notices.svelte'

const notice = {
  source: 'mute' as const,
  icon: 'sound-off' as const,
  title: 'Sound off',
  keys: ['Ctrl+M'],
  action: 'unmute'
}

describe('notice store', () => {
  beforeEach(() => {
    notices.current = null
  })

  it('copies shown notices and clears only the matching source', () => {
    notices.show(notice)

    expect(notices.current).toEqual(notice)
    expect(notices.current).not.toBe(notice)

    notices.clear('fullscreen')
    expect(notices.current).toEqual(notice)

    notices.clear('mute')
    expect(notices.current).toBeNull()
  })
})
