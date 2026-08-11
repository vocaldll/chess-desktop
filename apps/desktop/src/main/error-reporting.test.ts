import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(),
  app: {
    isPackaged: true,
    getVersion: vi.fn(() => '1.2.3')
  }
}))

vi.mock('@sentry/electron/main', () => ({
  init: mocks.init,
  captureException: mocks.captureException,
  flush: mocks.flush,
  IPCMode: { Classic: 'classic' }
}))
vi.mock('electron', () => ({ app: mocks.app }))

async function freshErrorReporting() {
  vi.resetModules()
  return import('./error-reporting')
}

describe('main error reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    mocks.app.isPackaged = true
  })

  it('initializes production reporting with privacy-focused options', async () => {
    const reporting = await freshErrorReporting()

    reporting.initializeErrorReporting(true)

    expect(mocks.init).toHaveBeenCalledOnce()
    const options = mocks.init.mock.calls[0][0]
    expect(options).toMatchObject({
      environment: 'production',
      release: 'chess-desktop@1.2.3',
      sendDefaultPii: false,
      sendClientReports: false,
      enableLogs: false,
      tracesSampleRate: 0,
      maxBreadcrumbs: 0,
      attachScreenshot: false,
      ipcMode: 'classic'
    })
    expect(options.beforeBreadcrumb({ category: 'ui.click' })).toBeNull()

    const integrations = options.integrations([
      { name: 'SentryMinidump' },
      { name: 'ElectronBreadcrumbs' },
      { name: 'ElectronContext' },
      { name: 'ChildProcess' },
      { name: 'MainProcessSession' },
      { name: 'PreloadInjection' },
      { name: 'LocalVariables' },
      { name: 'Context' },
      { name: 'OnUncaughtException' },
      { name: 'EventFilters' },
      { name: 'NormalizePaths' }
    ])
    expect(integrations.map(({ name }: { name: string }) => name)).toEqual([
      'ElectronContext',
      'ChildProcess',
      'OnUncaughtException',
      'EventFilters',
      'NormalizePaths'
    ])
  })

  it('gates events immediately when the setting changes', async () => {
    const reporting = await freshErrorReporting()

    reporting.initializeErrorReporting(false)
    const beforeSend = mocks.init.mock.calls[0][0].beforeSend
    expect(beforeSend({ message: 'disabled' })).toBeNull()

    reporting.setErrorReportingEnabled(true)
    expect(beforeSend({ message: 'enabled' })).toMatchObject({ message: 'enabled' })

    reporting.setErrorReportingEnabled(false)
    expect(beforeSend({ message: 'disabled again' })).toBeNull()
  })

  it('stays inactive in development unless explicitly requested', async () => {
    mocks.app.isPackaged = false
    vi.stubEnv('ELECTRON_RENDERER_URL', 'http://localhost:5173')
    const reporting = await freshErrorReporting()

    reporting.initializeErrorReporting(true)

    expect(mocks.init).not.toHaveBeenCalled()
  })

  it('supports an explicit development verification event', async () => {
    mocks.app.isPackaged = false
    vi.stubEnv('SENTRY_ENABLE_IN_DEVELOPMENT', '1')
    vi.stubEnv('SENTRY_TEST_EVENT', '1')
    const reporting = await freshErrorReporting()

    reporting.initializeErrorReporting(true)

    expect(mocks.captureException).toHaveBeenCalledOnce()
    expect(mocks.flush).toHaveBeenCalledWith(5_000)
    expect(mocks.captureException.mock.calls[0][0]).toMatchObject({
      message: 'Chess Desktop Sentry integration verification'
    })
  })
})
