import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Showcase from './Showcase'

describe('Showcase', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it.each([false, true])('rotates every five seconds with reduced motion set to %s', (matches) => {
    vi.useFakeTimers()
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    vi.spyOn(window, 'matchMedia').mockReturnValue({ ...media, matches })
    render(<Showcase />)

    act(() => vi.advanceTimersByTime(4999))
    expect(screen.getByRole('button', { name: 'Chess.com' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('button', { name: 'Lichess' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('figure')).toHaveAttribute('data-active-shot', 'Lichess')
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByRole('button', { name: 'Chess.com' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('starts a fresh five-second interval after manual selection', () => {
    vi.useFakeTimers()
    render(<Showcase />)
    act(() => vi.advanceTimersByTime(4000))
    fireEvent.click(screen.getByRole('button', { name: 'Lichess' }))
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('button', { name: 'Lichess' })).toHaveAttribute('aria-pressed', 'true')
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.getByRole('button', { name: 'Chess.com' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('keeps the full-size preview still and resumes rotation after closing it', () => {
    vi.useFakeTimers()
    render(<Showcase />)
    fireEvent.click(screen.getByRole('button', { name: /View full size/ }))
    const dialog = screen.getByRole('dialog')
    act(() => vi.advanceTimersByTime(10000))
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/chesscom-home-2560.webp')
    fireEvent.click(dialog)
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByRole('button', { name: 'Lichess' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens a standalone screenshot without gallery controls or a caption', () => {
    render(
      <Showcase
        loading="lazy"
        shots={[
          {
            src: '/app-settings-711.webp',
            srcSet: '/app-settings-360.webp 360w, /app-settings-711.webp 711w',
            label: 'App settings',
            alt: 'App settings screenshot',
            width: 711,
            height: 532,
          },
        ]}
      />,
    )

    expect(screen.queryByText('App settings')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /View full size/ }))

    const dialog = screen.getByRole('dialog', { name: 'Screenshot preview' })
    const screenshot = within(dialog).getByRole('img')
    expect(screenshot).toHaveAttribute('src', '/app-settings-711.webp')
    expect(screenshot).toHaveAttribute('width', '711')
    expect(screenshot).toHaveAttribute('sizes', expect.stringContaining('711px'))
    expect(screenshot).toHaveStyle({ '--showcase-width': '711px' })
    expect(within(dialog).queryByRole('group')).not.toBeInTheDocument()

    fireEvent.click(screenshot)
    expect(dialog).toHaveAttribute('open')
    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(screenshot).toHaveAttribute('src', '/app-settings-711.webp')
    fireEvent.click(dialog)
    expect(dialog).not.toHaveAttribute('open')
  })

  it('allows visitors to choose a screenshot', () => {
    const { container } = render(<Showcase />)
    const screenshots = container.querySelectorAll<HTMLImageElement>('.showcase-track img')

    expect(screenshots[0]).toHaveAttribute('loading', 'eager')
    expect(screenshots[0]).toHaveAttribute('fetchpriority', 'high')
    expect(screenshots[0]).toHaveAttribute('sizes', expect.stringContaining('46vw'))
    expect(screenshots[0]).toHaveAttribute('srcset', expect.stringContaining('672w'))
    expect(screenshots[1]).toHaveAttribute('loading', 'lazy')
    expect(screenshots[1]).toHaveAttribute('fetchpriority', 'low')

    fireEvent.click(screen.getByRole('button', { name: 'Lichess' }))

    expect(screen.getByRole('button', { name: 'Chess.com' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Lichess' })).toHaveAttribute('aria-pressed', 'true')
    expect(screenshots[0]).toHaveAttribute('loading', 'lazy')
    expect(screenshots[0]).toHaveAttribute('fetchpriority', 'low')
    expect(screenshots[1]).toHaveAttribute('loading', 'eager')
    expect(screenshots[1]).toHaveAttribute('fetchpriority', 'high')
  })

  it('opens the selected screenshot and closes on a backdrop click', () => {
    render(<Showcase />)
    fireEvent.click(screen.getByRole('button', { name: 'Lichess' }))
    fireEvent.click(screen.getByRole('button', { name: /View full size/ }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('open')
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/lichess-home-2560.webp')

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
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/lichess-home-2560.webp')

    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/chesscom-home-2560.webp')

    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/lichess-home-2560.webp')
  })
})
