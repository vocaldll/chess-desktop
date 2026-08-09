import { beforeEach, describe, expect, it, vi } from 'vitest'

const executeJavaScript = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({ webFrame: { executeJavaScript } }))

import { installMasterGain } from './audio'

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
})
