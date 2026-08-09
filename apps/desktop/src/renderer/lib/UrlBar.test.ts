import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '$shared/settings'
import type { ShortcutCommand } from '$shared/shortcuts'
import { browser } from './browser.svelte'
import { settings } from './settings.svelte'
import UrlBar from './UrlBar.svelte'

let shortcutListener: ((command: ShortcutCommand) => void) | undefined

describe('UrlBar', () => {
  beforeEach(() => {
    settings.current = { ...defaultSettings, zoom: { ...defaultSettings.zoom } }
    browser.url = 'https://www.chess.com/home'
    browser.error = null
    shortcutListener = undefined
    vi.restoreAllMocks()

    window.api = {
      shortcuts: {
        onCommand: vi.fn((listener) => {
          shortcutListener = listener
          return vi.fn()
        })
      }
    } as unknown as typeof window.api
  })

  it('normalizes and navigates to an allowed site path', async () => {
    const user = userEvent.setup()
    const navigate = vi.spyOn(browser, 'navigate').mockImplementation(() => undefined)
    render(UrlBar)
    const address = screen.getByRole('textbox', { name: 'Address' })

    await user.clear(address)
    await user.type(address, '/puzzles{Enter}')

    expect(navigate).toHaveBeenCalledWith('https://www.chess.com/puzzles')
  })

  it('rejects navigation outside the active site', async () => {
    const user = userEvent.setup()
    const navigate = vi.spyOn(browser, 'navigate').mockImplementation(() => undefined)
    render(UrlBar)
    const address = screen.getByRole('textbox', { name: 'Address' })

    await user.clear(address)
    await user.type(address, 'https://example.com{Enter}')

    expect(address).toHaveAttribute('aria-invalid', 'true')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('focuses the address field from the shortcut command', async () => {
    const user = userEvent.setup()
    render(UrlBar)
    const address = screen.getByRole('textbox', { name: 'Address' })
    const copy = screen.getByRole('button', { name: 'Copy address' })
    await user.click(copy)

    expect(address).not.toHaveFocus()
    shortcutListener?.('focus-address')
    expect(address).toHaveFocus()
  })

  it('copies the current address', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(UrlBar)

    await user.click(screen.getByRole('button', { name: 'Copy address' }))

    expect(writeText).toHaveBeenCalledWith('https://www.chess.com/home')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })
})
