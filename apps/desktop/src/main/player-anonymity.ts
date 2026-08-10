import type { WebContents } from 'electron'
import type { SiteId } from '../shared/sites'

const SELF_MARKER = 'data-chess-desktop-self'
const USERNAME_ELEMENT = '[data-test-element="user-tagline-username"]'
const ENABLED_TOKEN = '__ENABLED__'
const SIDES = ['top', 'bottom'] as const

const OPPONENT_DETAILS = [
  '[class*="cc-user-rating"]',
  '.rating-score-component',
  '.connection-component',
  '.cc-user-title-component',
  '.cc-country-flag-component',
  '.flair-rpc-component',
  '.cc-user-badge-component'
]

const PLACEHOLDER_AVATAR = 'https://www.chess.com/bundles/web/images/black_400.png'

const PLACEHOLDER_AVATAR_BODY = [
  'background-color: rgba(128, 128, 128, 0.25);',
  `background-image: url("${PLACEHOLDER_AVATAR}");`,
  'background-size: cover;',
  'background-position: center;',
  'background-repeat: no-repeat;'
].join('\n  ')

function opponentRule(selectors: readonly string[], body: string): string {
  const scoped = SIDES.flatMap((side) =>
    selectors.map((selector) => `html:not([${SELF_MARKER}="${side}"]) .player-${side} ${selector}`)
  )

  return `${scoped.join(',\n')} {\n  ${body}\n}`
}

const CHESSCOM_CSS = [
  opponentRule(OPPONENT_DETAILS, 'display: none !important;'),
  opponentRule(['.cc-avatar-img'], 'visibility: hidden !important;'),
  opponentRule(['.cc-avatar-component'], PLACEHOLDER_AVATAR_BODY),
  opponentRule([USERNAME_ELEMENT], 'font-size: 0 !important;'),
  opponentRule([`${USERNAME_ELEMENT}::after`], "content: 'Opponent'; font-size: 14px;")
].join('\n\n')

const CHESSCOM_SCRIPT = `
(() => {
  const MARKER = ${JSON.stringify(SELF_MARKER)}
  const USERNAME = ${JSON.stringify(USERNAME_ELEMENT)}

  if (!window.__chessDesktopAnonymity) {
    const SELF_SOURCES = [
      '#nav-user-dropdown a[href*="/member/"]',
      '.nav-user-username',
      'nav.sidebar-container a[href*="/member/"]',
      'nav a[href*="/member/"]',
      'header a[href*="/member/"]'
    ]

    let cachedSelf = ''
    let observer = null
    let frame = 0

    const memberName = (node) => {
      const path = (node.getAttribute('href') || '').split('/member/')[1]
      return path ? decodeURIComponent(path.split(/[/?#]/)[0]) : ''
    }

    const readSelf = () => {
      if (cachedSelf) {
        return cachedSelf
      }

      const global = window.chesscom && window.chesscom.user && window.chesscom.user.username

      if (typeof global === 'string' && global) {
        cachedSelf = global.trim().toLowerCase()
        return cachedSelf
      }

      for (const selector of SELF_SOURCES) {
        let node = null

        try {
          node = document.querySelector(selector)
        } catch {
          node = null
        }

        if (!node || node.closest('.player-component')) {
          continue
        }

        const value = (memberName(node) || node.textContent || '').trim()

        if (value) {
          cachedSelf = value.toLowerCase()
          return cachedSelf
        }
      }

      return ''
    }

    const taglineOf = (side) => {
      const node = document.querySelector('.player-' + side + ' ' + USERNAME)
      return node ? node.textContent.trim().toLowerCase() : ''
    }

    const update = () => {
      const self = readSelf()
      const onTop = Boolean(self) && self === taglineOf('top')
      const onBottom = Boolean(self) && self === taglineOf('bottom')

      if (onTop === onBottom) {
        document.documentElement.removeAttribute(MARKER)
        return
      }

      document.documentElement.setAttribute(MARKER, onTop ? 'top' : 'bottom')
    }

    const schedule = () => {
      if (frame) {
        return
      }

      frame = requestAnimationFrame(() => {
        frame = 0
        update()
      })
    }

    window.__chessDesktopAnonymity = (enabled) => {
      if (!enabled) {
        if (observer) {
          observer.disconnect()
          observer = null
        }

        document.documentElement.removeAttribute(MARKER)
        return
      }

      update()

      if (!observer && document.body) {
        observer = new MutationObserver(schedule)
        observer.observe(document.body, { subtree: true, childList: true })
      }
    }
  }

  window.__chessDesktopAnonymity(${ENABLED_TOKEN})
})()
`

const ANONYMITY_CSS: Record<SiteId, string | null> = {
  chesscom: CHESSCOM_CSS,
  lichess: null
}

const ANONYMITY_SCRIPTS: Record<SiteId, string | null> = {
  chesscom: CHESSCOM_SCRIPT,
  lichess: null
}

const insertedStyles = new WeakMap<WebContents, string>()
const operationVersions = new WeakMap<WebContents, number>()
const appliedSettings = new WeakMap<WebContents, { siteId: SiteId; hidden: boolean }>()

export function applyPlayerAnonymity(
  contents: WebContents | null,
  siteId: SiteId,
  hidden: boolean,
  refresh = false
): void {
  if (!contents || contents.isDestroyed()) {
    return
  }

  const applied = appliedSettings.get(contents)
  if (!refresh && applied?.siteId === siteId && applied.hidden === hidden) {
    return
  }

  appliedSettings.set(contents, { siteId, hidden })

  const version = (operationVersions.get(contents) ?? 0) + 1
  operationVersions.set(contents, version)

  const previousKey = insertedStyles.get(contents)
  insertedStyles.delete(contents)

  if (previousKey) {
    contents.removeInsertedCSS(previousKey).catch(() => null)
  }

  const script = ANONYMITY_SCRIPTS[siteId]

  if (script) {
    contents
      .executeJavaScript(script.replace(ENABLED_TOKEN, String(hidden)), true)
      .catch(() => null)
  }

  const css = ANONYMITY_CSS[siteId]

  if (!hidden || !css) {
    return
  }

  contents
    .insertCSS(css)
    .then((key) => {
      if (contents.isDestroyed()) {
        return
      }

      if (operationVersions.get(contents) !== version) {
        contents.removeInsertedCSS(key).catch(() => null)
        return
      }

      insertedStyles.set(contents, key)
    })
    .catch(() => null)
}
