import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import Notice from './Notice.svelte'
import { notices } from './notices.svelte'

describe('Notice', () => {
  beforeEach(() => {
    notices.current = null
  })

  it('starts its leave animation when clicked', async () => {
    const user = userEvent.setup()
    notices.show({
      source: 'mute',
      icon: 'sound-off',
      title: 'Sound off',
      keys: ['Ctrl+M'],
      action: 'unmute',
    })
    render(Notice)

    const notice = screen.getByRole('button')
    expect(notice).toHaveClass('visible')

    await user.click(notice)

    expect(notice).not.toHaveClass('visible')
    expect(notice).toBeDisabled()
    expect(screen.getByRole('status', { hidden: true })).toHaveAttribute('aria-hidden', 'true')
  })
})
