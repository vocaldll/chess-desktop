import * as Sentry from '@sentry/electron/renderer'
import { sanitizeErrorEvent } from '$shared/error-reporting'

const ALLOWED_INTEGRATIONS = new Set([
  'BrowserApiErrors',
  'Dedupe',
  'EventFilters',
  'FunctionToString',
  'GlobalHandlers',
  'InboundFilters',
  'LinkedErrors'
])

let reportingEnabled = false
let initialized = false

export function initializeRendererErrorReporting(enabled: boolean): void {
  reportingEnabled = enabled

  if (initialized || !import.meta.env.PROD) {
    return
  }

  initialized = true

  Sentry.init({
    sendDefaultPii: false,
    sendClientReports: false,
    enableLogs: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    integrations: (defaults) =>
      defaults.filter((integration) => ALLOWED_INTEGRATIONS.has(integration.name)),
    beforeBreadcrumb: () => null,
    beforeSend: (event) => (reportingEnabled ? sanitizeErrorEvent(event) : null)
  })
}

export function setRendererErrorReportingEnabled(enabled: boolean): void {
  reportingEnabled = enabled
}
