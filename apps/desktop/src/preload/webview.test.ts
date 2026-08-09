import { beforeEach, describe, expect, it, vi } from 'vitest'

const installMasterGain = vi.hoisted(() => vi.fn())

vi.mock('./audio', () => ({ installMasterGain }))

await import('./webview')

describe('guest webview preload', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('installs master volume handling', () => {
    expect(installMasterGain).toHaveBeenCalledOnce()
  })

  it.each([
    [3, 'back'],
    [4, 'forward']
  ])('routes mouse button %i to history.%s', (button, direction) => {
    const navigate = vi.spyOn(history, direction as 'back' | 'forward').mockImplementation(() => {})
    const event = new MouseEvent('mouseup', { button, cancelable: true })
    const preventDefault = vi.spyOn(event, 'preventDefault')

    window.dispatchEvent(event)

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledOnce()
  })

  it('ignores ordinary mouse buttons', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {})
    const forward = vi.spyOn(history, 'forward').mockImplementation(() => {})

    window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }))

    expect(back).not.toHaveBeenCalled()
    expect(forward).not.toHaveBeenCalled()
  })
})
