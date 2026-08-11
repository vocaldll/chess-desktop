import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void
  const handlers = new Map<string, Handler[]>()

  return {
    handlers,
    appOn: vi.fn((event: string, handler: Handler) => {
      const registered = handlers.get(event) ?? []
      registered.push(handler)
      handlers.set(event, registered)
    }),
    quit: vi.fn(),
    flushState: vi.fn(),
    registerContextMenus: vi.fn(),
    registerIpc: vi.fn(),
    registerShortcuts: vi.fn(),
    registerWebviewHandling: vi.fn()
  }
})

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    on: mocks.appOn,
    quit: mocks.quit,
    requestSingleInstanceLock: vi.fn().mockReturnValue(true),
    setAppUserModelId: vi.fn(),
    setName: vi.fn(),
    whenReady: vi.fn(() => new Promise(() => undefined)),
    userAgentFallback: ''
  },
  BrowserWindow: { getAllWindows: vi.fn().mockReturnValue([]) },
  Menu: { setApplicationMenu: vi.fn() }
}))
vi.mock('./context-menu', () => ({ registerContextMenus: mocks.registerContextMenus }))
vi.mock('./discord', () => ({ shutdownPresence: vi.fn() }))
vi.mock('./error-reporting', () => ({ initializeErrorReporting: vi.fn() }))
vi.mock('./ipc', () => ({ registerIpc: mocks.registerIpc }))
vi.mock('./keep-awake', () => ({ shutdownKeepAwake: vi.fn() }))
vi.mock('./permissions', () => ({ registerPermissions: vi.fn() }))
vi.mock('./settings-effects', () => ({ applySettings: vi.fn() }))
vi.mock('./shortcuts', () => ({ registerShortcuts: mocks.registerShortcuts }))
vi.mock('./store', () => ({
  flushState: mocks.flushState,
  getSettings: vi.fn(() => ({ anonymousErrorReporting: true }))
}))
vi.mock('./updates', () => ({ startAutoUpdates: vi.fn() }))
vi.mock('./webview', () => ({
  browserUserAgent: vi.fn().mockReturnValue('test-agent'),
  hardenWebviewAttachment: vi.fn(),
  registerAppCommands: vi.fn(),
  registerWebviewHandling: mocks.registerWebviewHandling
}))
vi.mock('./window', () => ({ createMainWindow: vi.fn() }))

function handler(event: string): (...args: unknown[]) => void {
  const registered = mocks.handlers.get(event)?.[0]
  if (!registered) {
    throw new Error(`Missing app handler for ${event}`)
  }
  return registered
}

describe('main process lifecycle', () => {
  it('reports a final persistence failure and still completes shutdown', async () => {
    const failure = new Error('disk unavailable')
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.flushState.mockRejectedValue(failure)
    await import('./index')
    const event = { preventDefault: vi.fn() }

    handler('will-quit')(event)

    await vi.waitFor(() => expect(mocks.quit).toHaveBeenCalledOnce())
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(error).toHaveBeenCalledWith('Failed to persist state before quitting:', failure)

    error.mockRestore()
  })
})
