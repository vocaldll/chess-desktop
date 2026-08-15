import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ openExternal: vi.fn() }))

vi.mock('electron', () => ({ shell: { openExternal: mocks.openExternal } }))

import { openExternalUrl } from './external-links'

describe('external links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.openExternal.mockResolvedValue(undefined)
  })

  it('opens supported URLs', () => {
    openExternalUrl('https://example.com/')

    expect(mocks.openExternal).toHaveBeenCalledWith('https://example.com/')
  })

  it('blocks unsupported protocols', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    openExternalUrl('javascript:alert(1)')

    expect(mocks.openExternal).not.toHaveBeenCalled()
    expect(warning).toHaveBeenCalledWith(
      'Blocked external URL with unsupported protocol:',
      'javascript:alert(1)',
    )
    warning.mockRestore()
  })

  it('logs shell failures', async () => {
    const failure = new Error('shell failed')
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.openExternal.mockRejectedValue(failure)

    openExternalUrl('https://example.com/')
    await vi.waitFor(() => {
      expect(error).toHaveBeenCalledWith('Failed to open external URL:', failure)
    })

    error.mockRestore()
  })
})
