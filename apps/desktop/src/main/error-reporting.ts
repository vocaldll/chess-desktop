import * as Sentry from '@sentry/electron/main'
import { app } from 'electron'
import { sanitizeErrorEvent } from '../shared/error-reporting'

const SENTRY_DSN =
  'https://b01655b5ac7e4a2cf30238248a906520@o4511889557422080.ingest.de.sentry.io/4511889566662736'

const ALLOWED_INTEGRATIONS = new Set([
  'ChildProcess',
  'ContextLines',
  'ElectronContext',
  'EventFilters',
  'FunctionToString',
  'LinkedErrors',
  'NormalizePaths',
  'OnUncaughtException',
  'OnUnhandledRejection',
])

let reportingEnabled = false
let initialized = false

function canSendReports(): boolean {
  return app.isPackaged || process.env.SENTRY_ENABLE_IN_DEVELOPMENT === '1'
}

export function initializeErrorReporting(enabled: boolean): void {
  reportingEnabled = enabled && canSendReports()

  const runningFromDevelopmentServer = Boolean(process.env.ELECTRON_RENDERER_URL)
  if (initialized || (runningFromDevelopmentServer && !canSendReports())) {
    return
  }

  initialized = true

  Sentry.init({
    dsn: SENTRY_DSN,
    release: `chess-desktop@${app.getVersion()}`,
    environment: app.isPackaged ? 'production' : 'development',
    sendDefaultPii: false,
    sendClientReports: false,
    enableLogs: false,
    debug: process.env.SENTRY_DEBUG === '1',
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    attachScreenshot: false,
    ipcMode: Sentry.IPCMode.Classic,
    integrations: (defaults) =>
      defaults.filter((integration) => ALLOWED_INTEGRATIONS.has(integration.name)),
    beforeBreadcrumb: () => null,
    beforeSend: (event) => (reportingEnabled ? sanitizeErrorEvent(event) : null),
    initialScope: {
      tags: { 'app.distribution': 'desktop' },
    },
  })

  if (reportingEnabled && process.env.SENTRY_TEST_EVENT === '1') {
    Sentry.captureException(new Error('Chess Desktop Sentry integration verification'))
    void Sentry.flush(5_000)
  }
}

export function setErrorReportingEnabled(enabled: boolean): void {
  reportingEnabled = enabled && canSendReports()
}
