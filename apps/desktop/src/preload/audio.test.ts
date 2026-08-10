import { JSDOM } from 'jsdom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const executeJavaScript = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({ webFrame: { executeJavaScript } }))

import { installMasterGain } from './audio'

function injectedScript(): string {
  installMasterGain()
  return executeJavaScript.mock.calls[0][0] as string
}

describe('master gain preload', () => {
  beforeEach(() => {
    executeJavaScript.mockReset()
    executeJavaScript.mockResolvedValue(undefined)
  })

  it('installs the isolated volume controller', () => {
    installMasterGain()

    expect(executeJavaScript).toHaveBeenCalledOnce()
    expect(executeJavaScript.mock.calls[0][0]).toContain('window.__chessDesktopVolume')
  })

  it('does not reject when injection fails', async () => {
    executeJavaScript.mockRejectedValue(new Error('frame destroyed'))

    expect(() => installMasterGain()).not.toThrow()
    await vi.waitFor(() => expect(executeJavaScript).toHaveBeenCalledOnce())
  })

  it('still scales media elements when the audio context cannot be wrapped', () => {
    const dom = new JSDOM('<!doctype html><html><body><audio></audio></body></html>', {
      runScripts: 'outside-only',
      pretendToBeVisual: true
    })
    const { window } = dom

    window.AudioContext = class {}

    const nativeVolume = Object.getOwnPropertyDescriptor(
      window.HTMLMediaElement.prototype,
      'volume'
    )

    window.eval(injectedScript())

    expect(typeof window.__chessDesktopVolume).toBe('function')

    const media = window.document.querySelector('audio') as HTMLAudioElement
    media.volume = 0.5
    window.__chessDesktopVolume(50)

    expect(nativeVolume?.get?.call(media)).toBe(0.25)
    expect(media.volume).toBe(0.5)
  })
})
