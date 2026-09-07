import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./useGitHubStars', () => ({
  useGitHubStars: () => null,
  formatStars: (stars: number) => String(stars),
}))

describe('section navigation', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it.each([
    ['Features', 'features'],
    ['Questions', 'questions'],
    ['Get the app', 'download'],
    ['Skip to content', 'main'],
    ['Chess Desktop home', 'root'],
  ])('scrolls with %s without adding a hash or a history entry', (label, id) => {
    window.history.replaceState({ preserved: true }, '', '/?source=test#root')
    render(
      <div id="root">
        <App />
      </div>,
    )
    const section = document.getElementById(id)
    if (!section) throw new Error(`Missing section: ${id}`)
    const scroll = vi.fn()
    section.scrollIntoView = scroll
    const historyLength = window.history.length

    fireEvent.click(screen.getByRole('button', { name: label }))

    expect(scroll).toHaveBeenCalledWith({ block: 'start' })
    expect(window.location.hash).toBe('')
    expect(window.location.search).toBe('?source=test')
    expect(window.history.state).toEqual({ preserved: true })
    expect(window.history.length).toBe(historyLength)
    if (id !== 'root') expect(section).toHaveFocus()
  })
})
