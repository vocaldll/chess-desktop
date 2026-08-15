import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchGitHubStars, formatStars, useGitHubStars } from './useGitHubStars'

describe('formatStars', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1.0k'],
    [1499, '1.5k'],
    [12_450, '12.4k'],
  ])('formats %i as %s', (stars, expected) => {
    expect(formatStars(stars)).toBe(expected)
  })
})

describe('fetchGitHubStars', () => {
  it('returns the repository star count', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ stargazers_count: 1234 }),
    })

    await expect(fetchGitHubStars(fetcher)).resolves.toBe(1234)
    expect(fetcher).toHaveBeenCalledWith('https://api.github.com/repos/vocaldll/chess-desktop', {
      headers: { accept: 'application/vnd.github+json' },
    })
  })

  it.each([
    ['an unsuccessful response', { ok: false }],
    ['a malformed response', { ok: true, json: vi.fn().mockResolvedValue({ stars: 1234 }) }],
  ])('returns null for %s', async (_label, response) => {
    const fetcher = vi.fn().mockResolvedValue(response)

    await expect(fetchGitHubStars(fetcher)).resolves.toBeNull()
  })

  it('returns null when the request fails', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'))

    await expect(fetchGitHubStars(fetcher)).resolves.toBeNull()
  })
})

describe('useGitHubStars', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the star count for consumers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ stargazers_count: 2468 }),
      }),
    )

    const { result } = renderHook(() => useGitHubStars())

    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current).toBe(2468))
  })
})
