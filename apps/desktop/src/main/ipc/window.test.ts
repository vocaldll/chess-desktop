import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC } from '../../shared/ipc-channels'

const mocks = vi.hoisted(() => ({
  on: vi.fn(),
  handle: vi.fn()
}))

vi.mock('electron', () => ({ ipcMain: mocks }))

import { registerWindowIpc } from './window'

type Handler = (...args: unknown[]) => unknown

function registration(mock: ReturnType<typeof vi.fn>, channel: string): Handler {
  const match = mock.mock.calls.find(([registered]) => registered === channel)
  if (!match) {
    throw new Error(`Missing registration for ${channel}`)
  }
  return match[1]
}

describe('window IPC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes window controls and toggles maximization', () => {
    const window = {
      minimize: vi.fn(),
      maximize: vi.fn(),
      unmaximize: vi.fn(),
      close: vi.fn(),
      isMaximized: vi.fn().mockReturnValue(false)
    }
    registerWindowIpc(() => window as never)

    registration(mocks.on, IPC.window.minimize)()
    registration(mocks.on, IPC.window.toggleMaximize)()
    window.isMaximized.mockReturnValue(true)
    registration(mocks.on, IPC.window.toggleMaximize)()
    registration(mocks.on, IPC.window.close)()

    expect(window.minimize).toHaveBeenCalledOnce()
    expect(window.maximize).toHaveBeenCalledOnce()
    expect(window.unmaximize).toHaveBeenCalledOnce()
    expect(window.close).toHaveBeenCalledOnce()
    expect(registration(mocks.handle, IPC.window.isMaximized)()).toBe(true)
  })

  it('is safe while no window exists', () => {
    registerWindowIpc(() => null)

    expect(() => registration(mocks.on, IPC.window.toggleMaximize)()).not.toThrow()
    expect(registration(mocks.handle, IPC.window.isMaximized)()).toBe(false)
  })
})
