import { render, screen } from '@testing-library/react'
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

  it('links to the current release downloads and source repository', () => {
    render(<Hero />)

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
      screen.getByRole('link', { name: 'Download for Windows' }).closest('[data-nosnippet]')
    ).not.toBeNull()
    expect(
      screen.getByRole('link', { name: /View on GitHub/ }).closest('[data-nosnippet]')
    ).not.toBeNull()
  })

  it('shows a compact star count after it loads', () => {
    mocks.useGitHubStars.mockReturnValue(1525)

    render(<Hero />)

    expect(screen.getByText('1.5k')).toBeInTheDocument()
    expect(screen.getByText('1.5k')).not.toHaveClass('invisible')
  })
})
