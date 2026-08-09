import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadLinux, downloadWindows, repository } from '../site'
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
    expect(screen.getByRole('link', { name: 'Download for Linux' })).toHaveAttribute(
      'href',
      downloadLinux
    )
    expect(screen.getByRole('link', { name: /View on GitHub/ })).toHaveAttribute('href', repository)
  })

  it('shows a compact star count after it loads', () => {
    mocks.useGitHubStars.mockReturnValue(1525)

    render(<Hero />)

    expect(screen.getByText('1.5k')).toBeInTheDocument()
  })
})
