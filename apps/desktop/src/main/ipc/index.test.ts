import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  registerAudioIpc: vi.fn(),
  registerLichessReviewIpc: vi.fn(),
  registerLinksIpc: vi.fn(),
  registerSettingsIpc: vi.fn(),
  registerWebviewIpc: vi.fn(),
  registerWindowIpc: vi.fn(),
}))

vi.mock('./audio', () => ({ registerAudioIpc: mocks.registerAudioIpc }))
vi.mock('./lichess-review', () => ({ registerLichessReviewIpc: mocks.registerLichessReviewIpc }))
vi.mock('./links', () => ({ registerLinksIpc: mocks.registerLinksIpc }))
vi.mock('./settings', () => ({ registerSettingsIpc: mocks.registerSettingsIpc }))
vi.mock('./webview', () => ({ registerWebviewIpc: mocks.registerWebviewIpc }))
vi.mock('./window', () => ({ registerWindowIpc: mocks.registerWindowIpc }))

import { registerIpc } from './index'

describe('IPC registration', () => {
  it('registers every service with the window accessor where needed', () => {
    const getWindow = vi.fn()

    registerIpc(getWindow)

    expect(mocks.registerWindowIpc).toHaveBeenCalledWith(getWindow)
    expect(mocks.registerSettingsIpc).toHaveBeenCalledWith(getWindow)
    expect(mocks.registerWebviewIpc).toHaveBeenCalledOnce()
    expect(mocks.registerAudioIpc).toHaveBeenCalledOnce()
    expect(mocks.registerLinksIpc).toHaveBeenCalledOnce()
    expect(mocks.registerLichessReviewIpc).toHaveBeenCalledOnce()
  })
})
