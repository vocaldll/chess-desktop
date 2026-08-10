import type { WebContents } from 'electron'
import type { SiteId } from '../shared/sites'

const SELF_MARKER = 'data-chess-desktop-self'
const SELF_LINK_MARKER = 'data-chess-desktop-me'
const OPPONENT_LINK_MARKER = 'data-chess-desktop-them'
const ENABLED_TOKEN = '__ENABLED__'
const SIDES = ['top', 'bottom'] as const

const PLACEHOLDER_AVATAR = 'https://www.chess.com/bundles/web/images/black_400.png'
const CHESSCOM_USERNAME = '[data-test-element="user-tagline-username"]'

const PLACEHOLDER_AVATAR_BODY = [
  'background-color: rgba(128, 128, 128, 0.25);',
  `background-image: url("${PLACEHOLDER_AVATAR}");`,
  'background-size: cover;',
  'background-position: center;',
  'background-repeat: no-repeat;'
].join('\n  ')

interface OpponentRule {
  selectors: readonly string[]
  body: string
}

interface SiteAnonymity {
  seatPrefix: string
  rules: readonly OpponentRule[]
  linkRules?: readonly OpponentRule[]
  readSelf: string
  readSeat: string
  markLinks?: string
}

const CHESSCOM_READ_SELF = `
      const SELF_SOURCES = [
        '#nav-user-dropdown a[href*="/member/"]',
        '.nav-user-username',
        'nav.sidebar-container a[href*="/member/"]',
        'nav a[href*="/member/"]',
        'header a[href*="/member/"]'
      ]

      const fromGlobal = window.chesscom && window.chesscom.user && window.chesscom.user.username

      if (typeof fromGlobal === 'string' && fromGlobal) {
        return fromGlobal
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

        const path = (node.getAttribute('href') || '').split('/member/')[1]
        const named = path ? decodeURIComponent(path.split(/[/?#]/)[0]) : ''
        const value = (named || node.textContent || '').trim()

        if (value) {
          return value
        }
      }

      return ''
`

const CHESSCOM_READ_SEAT = `
      const node = document.querySelector('.player-' + side + ' ${CHESSCOM_USERNAME}')
      return node ? node.textContent : ''
`

const CHESSCOM_CHAT_AUTHOR = '.user-username-component'
const CHESSCOM_CHAT_TAGLINE = `.user-tagline-chat-component[${OPPONENT_LINK_MARKER}]`

const CHESSCOM_MARK_LINKS = `
        for (const node of document.querySelectorAll('.chat-message-component ${CHESSCOM_CHAT_AUTHOR}')) {
          const tagline = node.closest('.user-tagline-chat-component') || node
          const name = normalize((node.textContent || '').replace(/:\\s*$/, ''))

          if (them && name === them) {
            tagline.setAttribute(${JSON.stringify(OPPONENT_LINK_MARKER)}, '')
          } else {
            tagline.removeAttribute(${JSON.stringify(OPPONENT_LINK_MARKER)})
          }
        }
`

const CHESSCOM_LINK_RULES: readonly OpponentRule[] = [
  {
    selectors: [
      `${CHESSCOM_CHAT_TAGLINE} .user-tagline-chat-flair`,
      `${CHESSCOM_CHAT_TAGLINE} .flair-rpc-component`
    ],
    body: 'display: none !important;'
  },
  {
    selectors: [`${CHESSCOM_CHAT_TAGLINE} ${CHESSCOM_CHAT_AUTHOR}`],
    body: 'font-size: 0 !important;'
  },
  {
    selectors: [`${CHESSCOM_CHAT_TAGLINE} ${CHESSCOM_CHAT_AUTHOR}::after`],
    body: "content: 'Opponent:'; font-size: 14px;"
  }
]

const LICHESS_READ_SELF = `
      return document.body ? document.body.dataset.user || '' : ''
`

const LICHESS_READ_SEAT = `
      const node = document.querySelector('.ruser-' + side + ' a.user-link')
      const path = (node ? node.getAttribute('href') || '' : '').split('/@/')[1]
      return path ? decodeURIComponent(path.split(/[/?#]/)[0]) : ''
`

const LICHESS_MARK_LINKS = `
        for (const node of document.querySelectorAll('a.user-link')) {
          const path = (node.getAttribute('href') || '').split('/@/')[1]
          const name = path ? normalize(decodeURIComponent(path.split(/[/?#]/)[0])) : ''

          if (self && name === self) {
            node.setAttribute(${JSON.stringify(SELF_LINK_MARKER)}, '')
          } else {
            node.removeAttribute(${JSON.stringify(SELF_LINK_MARKER)})
          }

          if (them && name === them) {
            node.setAttribute(${JSON.stringify(OPPONENT_LINK_MARKER)}, '')
          } else {
            node.removeAttribute(${JSON.stringify(OPPONENT_LINK_MARKER)})
          }
        }
`

const NOT_SELF_LINK = `a.user-link:not([${SELF_LINK_MARKER}])`
const OPPONENT_LINK = `a.user-link[${OPPONENT_LINK_MARKER}]`

const LICHESS_LINK_SCOPES = [
  { scope: '.game__meta', link: NOT_SELF_LINK, fontSize: '0.9rem' },
  { scope: '.crosstable', link: NOT_SELF_LINK, fontSize: '1rem' },
  { scope: '.mchat', link: OPPONENT_LINK, fontSize: '0.9rem' }
]

const LICHESS_LINK_RULES: readonly OpponentRule[] = [
  {
    selectors: LICHESS_LINK_SCOPES.flatMap(({ scope, link }) =>
      ['.utitle', '.uflair', '.rating'].map((part) => `${scope} ${link} ${part}`)
    ),
    body: 'display: none !important;'
  },
  {
    selectors: LICHESS_LINK_SCOPES.map(({ scope, link }) => `${scope} ${link}`),
    body: 'font-size: 0 !important;'
  },
  ...LICHESS_LINK_SCOPES.map(({ scope, link, fontSize }) => ({
    selectors: [`${scope} ${link}::after`],
    body: `content: 'Opponent'; font-size: ${fontSize};`
  }))
]

const ANONYMITY: Record<SiteId, SiteAnonymity> = {
  chesscom: {
    seatPrefix: '.player-',
    rules: [
      {
        selectors: [
          '[class*="cc-user-rating"]',
          '.rating-score-component',
          '.connection-component',
          '.cc-user-title-component',
          '.cc-country-flag-component',
          '.flair-rpc-component',
          '.cc-user-badge-component'
        ],
        body: 'display: none !important;'
      },
      { selectors: ['.cc-avatar-img'], body: 'visibility: hidden !important;' },
      { selectors: ['.cc-avatar-component'], body: PLACEHOLDER_AVATAR_BODY },
      { selectors: [CHESSCOM_USERNAME], body: 'font-size: 0 !important;' },
      {
        selectors: [`${CHESSCOM_USERNAME}::after`],
        body: "content: 'Opponent'; font-size: 14px;"
      }
    ],
    linkRules: CHESSCOM_LINK_RULES,
    readSelf: CHESSCOM_READ_SELF,
    readSeat: CHESSCOM_READ_SEAT,
    markLinks: CHESSCOM_MARK_LINKS
  },
  lichess: {
    seatPrefix: '.ruser-',
    rules: [
      {
        selectors: ['.utitle', '.uflair', 'rating', 'icon.line'],
        body: 'display: none !important;'
      },
      { selectors: ['a.user-link'], body: 'font-size: 0 !important;' },
      { selectors: ['a.user-link::after'], body: "content: 'Opponent'; font-size: 1.2rem;" }
    ],
    linkRules: LICHESS_LINK_RULES,
    readSelf: LICHESS_READ_SELF,
    readSeat: LICHESS_READ_SEAT,
    markLinks: LICHESS_MARK_LINKS
  }
}

function declare(selectors: readonly string[], body: string): string {
  return `${selectors.join(',\n')} {\n  ${body}\n}`
}

function buildCSS({ seatPrefix, rules, linkRules = [] }: SiteAnonymity): string {
  const seated = rules.map(({ selectors, body }) =>
    declare(
      SIDES.flatMap((side) =>
        selectors.map(
          (selector) => `html:not([${SELF_MARKER}="${side}"]) ${seatPrefix}${side} ${selector}`
        )
      ),
      body
    )
  )

  const linked = linkRules.map(({ selectors, body }) => declare(selectors, body))

  return [...seated, ...linked].join('\n\n')
}

function buildScript({ readSelf, readSeat, markLinks = '' }: SiteAnonymity): string {
  return `
(() => {
  const MARKER = ${JSON.stringify(SELF_MARKER)}

  if (!window.__chessDesktopAnonymity) {
    let cachedSelf = ''
    let observer = null
    let frame = 0

    const normalize = (value) => String(value == null ? '' : value).trim().toLowerCase()

    const readSelf = () => {
      if (cachedSelf) {
        return cachedSelf
      }

      try {
        cachedSelf = normalize((() => {${readSelf}      })())
      } catch {
        cachedSelf = ''
      }

      return cachedSelf
    }

    const seatName = (side) => {
      try {
        return normalize((() => {${readSeat}      })())
      } catch {
        return ''
      }
    }

    const markLinks = (self, them) => {
      try {${markLinks}      } catch {}
    }

    const update = () => {
      const self = readSelf()
      const top = seatName('top')
      const bottom = seatName('bottom')
      const onTop = Boolean(self) && self === top
      const onBottom = Boolean(self) && self === bottom
      const seated = onTop !== onBottom

      markLinks(self, seated ? (onTop ? bottom : top) : '')

      if (!seated) {
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

        markLinks('', '')
        document.documentElement.removeAttribute(MARKER)
        return
      }

      update()

      if (!observer) {
        observer = new MutationObserver(schedule)
        observer.observe(document.documentElement, { subtree: true, childList: true })
      }
    }
  }

  window.__chessDesktopAnonymity(${ENABLED_TOKEN})
})()
`
}

const ANONYMITY_CSS: Record<SiteId, string> = {
  chesscom: buildCSS(ANONYMITY.chesscom),
  lichess: buildCSS(ANONYMITY.lichess)
}

const ANONYMITY_SCRIPTS: Record<SiteId, string> = {
  chesscom: buildScript(ANONYMITY.chesscom),
  lichess: buildScript(ANONYMITY.lichess)
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

  contents
    .executeJavaScript(ANONYMITY_SCRIPTS[siteId].replace(ENABLED_TOKEN, String(hidden)), true)
    .catch(() => null)

  if (!hidden) {
    return
  }

  contents
    .insertCSS(ANONYMITY_CSS[siteId])
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
