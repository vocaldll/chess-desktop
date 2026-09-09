import { fireEvent, render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import CloseGameModal from './CloseGameModal.svelte'

describe('close game modal', () => {
  let requestClose: () => void
  const respondToClose = vi.fn()
  const unsubscribe = vi.fn()
  const setRecording = vi.fn()

  beforeAll(() => {
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.open = true
        },
      },
      close: {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.open = false
        },
      },
    })
  })

  afterAll(() => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('api', {
      window: {
        onCloseRequested: (listener: () => void) => {
          requestClose = listener
          return unsubscribe
        },
        respondToClose,
      },
      shortcuts: { setRecording },
    })
  })

  it('focuses Keep playing and cancels without closing the app', async () => {
    const user = userEvent.setup()
    render(CloseGameModal)
    requestClose()
    expect(screen.getByRole('dialog', { name: 'Leave your game?' })).toBeVisible()
    const keepPlaying = screen.getByRole('button', { name: 'Keep playing' })
    expect(keepPlaying).toHaveFocus()
    await user.click(keepPlaying)
    expect(respondToClose).toHaveBeenCalledWith(false)
    expect(setRecording).toHaveBeenLastCalledWith(false)
  })

  it('only confirms closing through Close app', async () => {
    const user = userEvent.setup()
    render(CloseGameModal)
    requestClose()
    await user.click(screen.getByRole('button', { name: 'Close app' }))
    expect(respondToClose).toHaveBeenCalledWith(true)
  })

  it('treats dialog cancellation as Keep playing and unsubscribes on unmount', async () => {
    const { unmount } = render(CloseGameModal)
    requestClose()
    await fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(respondToClose).toHaveBeenCalledWith(false)
    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
