import type { WebContents } from 'electron'

const REJECT_CONSENT = `
(() => {
  if (!document.querySelector('script[src*="cookielaw.org"]')) {
    return
  }

  if (document.cookie.includes('OptanonAlertBoxClosed')) {
    return
  }

  const deadline = Date.now() + 15000

  const attempt = () => {
    const consent = window.OneTrust

    if (consent && typeof consent.RejectAll === 'function') {
      consent.RejectAll()
      return
    }

    if (Date.now() < deadline) {
      setTimeout(attempt, 250)
    }
  }

  attempt()
})()
`

export function rejectCookieBanners(contents: WebContents): void {
  contents.executeJavaScript(REJECT_CONSENT, true).catch(() => null)
}
