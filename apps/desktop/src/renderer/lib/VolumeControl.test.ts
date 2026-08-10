import { act, fireEvent, render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '$shared/settings'
import { settings } from './settings.svelte'
import VolumeControl from './VolumeControl.svelte'

const setVolume = vi.fn()
const onPointerDown = vi.fn()

describe('VolumeControl', () => {
  beforeEach(() => {
    settings.current = { ...defaultSettings, zoom: { ...defaultSettings.zoom } }
    vi.restoreAllMocks()
    setVolume.mockReset()
    onPointerDown.mockReset()
    onPointerDown.mockReturnValue(vi.fn())
    window.api = {
      audio: { setVolume },
      webview: { onPointerDown }
    } as unknown as typeof window.api
  })

  it('previews and persists volume changes', async () => {
    const user = userEvent.setup()
    const set = vi.spyOn(settings, 'set').mockResolvedValue(undefined)
    render(VolumeControl)

    await user.click(screen.getByRole('button', { name: 'Volume' }))
    const slider = screen.getByRole('slider', { name: 'Volume level' })
    await fireEvent.input(slider, { target: { value: '25' } })
    await fireEvent.change(slider, { target: { value: '25' } })

    expect(setVolume).toHaveBeenCalledWith(25)
    expect(set).toHaveBeenCalledWith('volume', 25)
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('unmutes when a positive volume is committed', async () => {
    settings.current = { ...settings.current, soundMuted: true }
    const user = userEvent.setup()
    const set = vi.spyOn(settings, 'set').mockResolvedValue(undefined)
    render(VolumeControl)

    await user.click(screen.getByRole('button', { name: 'Volume' }))
    const slider = screen.getByRole('slider', { name: 'Volume level' })
    await fireEvent.change(slider, { target: { value: '40' } })

    expect(set).toHaveBeenCalledWith('volume', 40)
    expect(set).toHaveBeenCalledWith('soundMuted', false)
  })

  it('closes the popover with Escape', async () => {
    const user = userEvent.setup()
    render(VolumeControl)

    await user.click(screen.getByRole('button', { name: 'Volume' }))
    expect(screen.getByRole('slider', { name: 'Volume level' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('slider', { name: 'Volume level' })).not.toBeInTheDocument()
  })

  it('closes the popover when the page is clicked', async () => {
    const user = userEvent.setup()
    const unsubscribe = vi.fn()
    onPointerDown.mockReturnValue(unsubscribe)
    render(VolumeControl)

    await user.click(screen.getByRole('button', { name: 'Volume' }))
    expect(screen.getByRole('slider', { name: 'Volume level' })).toBeInTheDocument()

    const notifyPagePointer = onPointerDown.mock.calls[0][0] as () => void
    await act(() => {
      notifyPagePointer()
    })

    expect(screen.queryByRole('slider', { name: 'Volume level' })).not.toBeInTheDocument()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
