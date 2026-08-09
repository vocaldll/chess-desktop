import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '$shared/settings'
import SiteSwitcher from './SiteSwitcher.svelte'
import { settings } from './settings.svelte'

describe('SiteSwitcher', () => {
  beforeEach(() => {
    settings.current = { ...defaultSettings, zoom: { ...defaultSettings.zoom } }
    vi.restoreAllMocks()
  })

  it('marks the active site and selects another site', async () => {
    const user = userEvent.setup()
    const set = vi.spyOn(settings, 'set').mockResolvedValue(undefined)
    render(SiteSwitcher)

    expect(screen.getByRole('button', { name: 'Chess.com' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Lichess' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'Lichess' }))

    expect(set).toHaveBeenCalledWith('activeSite', 'lichess')
  })

  it('does not persist the already active site', async () => {
    const user = userEvent.setup()
    const set = vi.spyOn(settings, 'set').mockResolvedValue(undefined)
    render(SiteSwitcher)

    await user.click(screen.getByRole('button', { name: 'Chess.com' }))

    expect(set).not.toHaveBeenCalled()
  })
})
