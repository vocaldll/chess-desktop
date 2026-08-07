import { useEffect, useState } from 'react'
import { site } from './site'

let pending: Promise<number | null> | null = null

function load(): Promise<number | null> {
  if (!pending) {
    pending = fetch(`https://api.github.com/repos/${site.owner}/${site.repo}`, {
      headers: { accept: 'application/vnd.github+json' }
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) =>
        data && typeof data.stargazers_count === 'number' ? data.stargazers_count : null
      )
      .catch(() => null)
  }

  return pending
}

export function formatStars(stars: number): string {
  return stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : String(stars)
}

export function useGitHubStars(): number | null {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    let active = true

    load().then((value) => {
      if (active) {
        setStars(value)
      }
    })

    return () => {
      active = false
    }
  }, [])

  return stars
}
