import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Showcase from './Showcase'

describe('Showcase', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
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

  it('rotates screenshots without a transition when reduced motion is enabled', () => {
    vi.useFakeTimers()
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    render(<Showcase />)

    expect(screen.getByRole('img', { name: 'Chess Desktop running Chess.com' })).toHaveClass(
      'motion-reduce:transition-none'
    )

    act(() => vi.advanceTimersByTime(5000))

    expect(screen.getByRole('button', { name: 'Lichess' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens the selected screenshot and closes on a backdrop click', () => {
    render(<Showcase />)
    fireEvent.click(screen.getByRole('button', { name: 'Lichess' }))
    fireEvent.click(screen.getByRole('button', { name: /View full size/ }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('open')
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/showcase-lichess.webp')

    fireEvent.click(dialog)
    expect(dialog).not.toHaveAttribute('open')
  })

  it('switches screenshots within the preview', () => {
    render(<Showcase />)
    fireEvent.click(screen.getByRole('button', { name: /View full size/ }))

    const dialog = screen.getByRole('dialog', { name: 'Screenshot preview' })
    const close = within(dialog).getByRole('button', { name: 'Close' })
    expect(close).toHaveClass('fixed')
    expect(close).not.toHaveClass('md:absolute')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Lichess' }))
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/showcase-lichess.webp')

    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/showcase-chesscom.webp')

    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/showcase-lichess.webp')
  })
})
