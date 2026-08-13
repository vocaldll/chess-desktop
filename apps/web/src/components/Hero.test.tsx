import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadLinuxArm64, downloadLinuxX64, downloadWindows, repository } from '../site'
import Hero from './Hero'

const mocks = vi.hoisted(() => ({ useGitHubStars: vi.fn() }))

vi.mock('../useGitHubStars', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../useGitHubStars')>()),
  useGitHubStars: mocks.useGitHubStars
}))

describe('Hero', () => {
  beforeEach(() => {
    mocks.useGitHubStars.mockReturnValue(null)
  })

  it('links to the current release downloads and source repository', async () => {
    const user = userEvent.setup()
    render(<Hero />)

    expect(screen.queryByRole('link', { name: 'Download for Windows' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Download for Linux x64' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Download Chess Desktop' }))

    expect(screen.getByRole('link', { name: 'Download for Windows' })).toHaveAttribute(
      'href',
      downloadWindows
    )
    expect(screen.getByRole('link', { name: 'Download for Linux x64' })).toHaveAttribute(
      'href',
      downloadLinuxX64
    )
    expect(screen.getByRole('link', { name: 'Download for Linux ARM64' })).toHaveAttribute(
      'href',
      downloadLinuxArm64
    )
    expect(screen.getByRole('link', { name: /View on GitHub/ })).toHaveAttribute('href', repository)
    expect(screen.getByText('0')).toHaveClass('invisible')
  })

  it('keeps the call to action out of search result snippets', () => {
    render(<Hero />)

    expect(
      screen.getByRole('button', { name: 'Download Chess Desktop' }).closest('[data-nosnippet]')
    ).not.toBeNull()
    expect(
      screen.getByRole('link', { name: /View on GitHub/ }).closest('[data-nosnippet]')
    ).not.toBeNull()
  })

  it('closes the download options with Escape and restores focus', async () => {
    const user = userEvent.setup()
    render(<Hero />)
    const trigger = screen.getByRole('button', { name: 'Download Chess Desktop' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('link', { name: 'Download for Windows' })).not.toBeInTheDocument()
  })

  it('closes the download options after an outside press', async () => {
    const user = userEvent.setup()
    render(<Hero />)
    const trigger = screen.getByRole('button', { name: 'Download Chess Desktop' })

    await user.click(trigger)
    await user.click(screen.getByRole('heading', { level: 1 }))

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows a compact star count after it loads', () => {
    mocks.useGitHubStars.mockReturnValue(1525)

    render(<Hero />)

    expect(screen.getByText('1.5k')).toBeInTheDocument()
    expect(screen.getByText('1.5k')).not.toHaveClass('invisible')
  })
})
