import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Toggle from './Toggle.svelte'

describe('Toggle', () => {
  it('reports the next checked value', async () => {
    const user = userEvent.setup()
    const onchange = vi.fn()
    render(Toggle, { checked: false, label: 'Enable notifications', onchange })

    await user.click(screen.getByRole('checkbox', { name: 'Enable notifications' }))

    expect(onchange).toHaveBeenCalledWith(true)
  })

  it('does not change while disabled', async () => {
    const user = userEvent.setup()
    const onchange = vi.fn()
    render(Toggle, {
      checked: true,
      label: 'Enable notifications',
      disabled: true,
      onchange
    })

    await user.click(screen.getByRole('checkbox', { name: 'Enable notifications' }))

    expect(onchange).not.toHaveBeenCalled()
  })
})
