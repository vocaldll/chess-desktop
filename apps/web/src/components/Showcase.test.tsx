import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Showcase from './Showcase'

describe('Showcase', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows visitors to choose a screenshot', () => {
    render(<Showcase />)

    fireEvent.click(screen.getByRole('button', { name: 'Lichess' }))

    expect(screen.getByRole('button', { name: 'Chess.com' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(screen.getByRole('button', { name: 'Lichess' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('rotates screenshots and pauses while hovered', () => {
    vi.useFakeTimers()
    render(<Showcase />)

    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByRole('button', { name: 'Lichess' })).toHaveAttribute('aria-pressed', 'true')

    const figure = screen.getByRole('button', { name: /View full size/ }).closest('figure')
    expect(figure).not.toBeNull()
    fireEvent.mouseEnter(figure as HTMLElement)
    act(() => vi.advanceTimersByTime(5000))

    expect(screen.getByRole('button', { name: 'Lichess' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens the selected screenshot and closes on a backdrop click', () => {
    render(<Showcase />)
    fireEvent.click(screen.getByRole('button', { name: 'Lichess' }))
    fireEvent.click(screen.getByRole('button', { name: /View full size/ }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('open')
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/showcase-lichess.png')

    fireEvent.click(dialog)
    expect(dialog).not.toHaveAttribute('open')
  })
})
