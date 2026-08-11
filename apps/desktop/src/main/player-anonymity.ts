import type { WebContents } from 'electron'
import type { SiteId } from '../shared/sites'

const SELF_MARKER = 'data-chess-desktop-self'
const SELF_LINK_MARKER = 'data-chess-desktop-me'
const OPPONENT_LINK_MARKER = 'data-chess-desktop-them'
const OPPONENT_HIDDEN_TOKEN = '__OPPONENT_HIDDEN__'
const RATINGS_HIDDEN_TOKEN = '__RATINGS_HIDDEN__'
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
  ratingSelectors: readonly string[]
  additionalRatingSelectors: readonly string[]
  rules: readonly OpponentRule[]
  linkRules?: readonly OpponentRule[]
  readSelf: string
  readSeat: string
  markLinks?: string
  watchSelector: string
  watchClasses: readonly string[]
}

const CHESSCOM_SELF_SOURCES = [
  '#nav-user-dropdown a[href*="/member/"]',
  '.nav-user-username',
  'nav.sidebar-container a[href*="/member/"]',
  'nav a[href*="/member/"]',
  'header a[href*="/member/"]'
] as const

const CHESSCOM_READ_SELF = `
      const SELF_SOURCES = ${JSON.stringify(CHESSCOM_SELF_SOURCES)}

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
const CHESSCOM_GAME_MESSAGES = [
  '.game-start-message-component',
  '.game-over-message-component',
  '.game-rate-sport-message-component'
] as const
const CHESSCOM_MESSAGE_OPPONENT = CHESSCOM_GAME_MESSAGES.map(
  (selector) => `${selector} a.user-username[${OPPONENT_LINK_MARKER}]`
)

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

        const messageSelector = ${JSON.stringify(CHESSCOM_GAME_MESSAGES.join(', '))}
        const messageUserSelector = ${JSON.stringify(
          CHESSCOM_GAME_MESSAGES.map((selector) => `${selector} a.user-username`).join(', ')
        )}

        for (const node of document.querySelectorAll(messageUserSelector)) {
          const path = (node.getAttribute('href') || '').split('/member/')[1]
          const name = normalize(path ? decodeURIComponent(path.split(/[/?#]/)[0]) : node.textContent)

          if (them && name === them) {
            node.setAttribute(${JSON.stringify(OPPONENT_LINK_MARKER)}, '')
          } else {
            node.removeAttribute(${JSON.stringify(OPPONENT_LINK_MARKER)})
          }
        }

        for (const message of document.querySelectorAll(messageSelector)) {
          const textNodes = []
          const walker = document.createTreeWalker(message, NodeFilter.SHOW_TEXT)
          let textNode = walker.nextNode()

          while (textNode) {
            textNodes.push(textNode)
            textNode = walker.nextNode()
          }

          for (const node of textNodes) {
            if (!opponentHidden && !ratingsHidden) {
              restoreText(node)
              continue
            }

            const previous = node.previousSibling
            const followsOpponent =
              previous instanceof Element &&
              previous.matches('a.user-username[${OPPONENT_LINK_MARKER}]')
            const ratingResult =
              ratingsHidden &&
              message.matches('.game-over-message-component') &&
              node.parentElement &&
              node.parentElement.matches('strong') &&
              node.parentElement.previousSibling &&
              /Your new\\s+.*?\\s+rating is\\s*$/i.test(
                sourceText(node.parentElement.previousSibling)
              )

            writeText(node, (source) => {
              if (ratingResult) {
                return ''
              }

              let value = source

              if (ratingsHidden) {
                value = value.replace(/\\s*\\(\\d{2,4}\\??\\)/g, '')
              } else if (opponentHidden && followsOpponent) {
                value = value.replace(/^\\s*\\(\\d{2,4}\\??\\)/, '')
              }

              if (opponentHidden || ratingsHidden) {
                value = value.replace(
                  /\\s*win\\s+[+-]?\\d+\\s*\\/\\s*draw\\s+[+-]?\\d+\\s*\\/\\s*lose\\s+[+-]?\\d+/gi,
                  ''
                )
              }

              if (ratingsHidden && message.matches('.game-over-message-component')) {
                value = value
                  .replace(/Your new\\s+.*?\\s+rating is\\s*/gi, '')
                  .replace(/^\\s*\\([+-]\\d+\\)\\.?/, '')
              }

              return value
            })
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
  },
  {
    selectors: CHESSCOM_MESSAGE_OPPONENT,
    body: 'font-size: 0 !important;'
  },
  {
    selectors: CHESSCOM_MESSAGE_OPPONENT.map((selector) => `${selector}::after`),
    body: "content: 'Opponent'; font-size: 14px;"
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
    ratingSelectors: ['[class*="cc-user-rating"]', '.rating-score-component'],
    additionalRatingSelectors: ['.game-over-stat-card-rating'],
    rules: [
      {
        selectors: [
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
    markLinks: CHESSCOM_MARK_LINKS,
    watchSelector: [
      ...CHESSCOM_SELF_SOURCES,
      CHESSCOM_USERNAME,
      `.chat-message-component ${CHESSCOM_CHAT_AUTHOR}`,
      ...CHESSCOM_GAME_MESSAGES
    ].join(', '),
    watchClasses: ['player-top', 'player-bottom']
  },
  lichess: {
    seatPrefix: '.ruser-',
    ratingSelectors: ['rating'],
    additionalRatingSelectors: [
      '.game__meta a.user-link .rating',
      '.crosstable a.user-link .rating'
    ],
    rules: [
      {
        selectors: ['.utitle', '.uflair', 'icon.line'],
        body: 'display: none !important;'
      },
      { selectors: ['a.user-link'], body: 'font-size: 0 !important;' },
      { selectors: ['a.user-link::after'], body: "content: 'Opponent'; font-size: 1.2rem;" }
    ],
    linkRules: LICHESS_LINK_RULES,
    readSelf: LICHESS_READ_SELF,
    readSeat: LICHESS_READ_SEAT,
    markLinks: LICHESS_MARK_LINKS,
    watchSelector: 'a.user-link',
    watchClasses: ['ruser-top', 'ruser-bottom']
  }
}

function declare(selectors: readonly string[], body: string): string {
  return `${selectors.join(',\n')} {\n  ${body}\n}`
}

function buildCSS({ seatPrefix, ratingSelectors, rules, linkRules = [] }: SiteAnonymity): string {
  const seated = [...rules, { selectors: ratingSelectors, body: 'display: none !important;' }].map(
    ({ selectors, body }) =>
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

function buildRatingCSS({
  seatPrefix,
  ratingSelectors,
  additionalRatingSelectors
}: SiteAnonymity): string {
  return declare(
    [
      ...SIDES.flatMap((side) =>
        ratingSelectors.map((selector) => `${seatPrefix}${side} ${selector}`)
      ),
      ...additionalRatingSelectors
    ],
    'display: none !important;'
  )
}

function buildScript({
  readSelf,
  readSeat,
  markLinks = '',
  watchSelector,
  watchClasses
}: SiteAnonymity): string {
  return `
(() => {
  const MARKER = ${JSON.stringify(SELF_MARKER)}
  const WATCH_SELECTOR = ${JSON.stringify(watchSelector)}
  const WATCH_CLASSES = ${JSON.stringify(watchClasses)}

  if (!window.__chessDesktopAnonymity) {
    let observer = null
    let frame = 0
    let opponentEnabled = false
    let ratingsEnabled = false
    const originalTexts = new WeakMap()

    const normalize = (value) => String(value == null ? '' : value).trim().toLowerCase()

    const sourceText = (node) => {
      const current = node.nodeValue || ''
      const stored = originalTexts.get(node)

      if (!stored || current !== stored.rendered) {
        const next = { source: current, rendered: current }
        originalTexts.set(node, next)
        return next.source
      }

      return stored.source
    }

    const writeText = (node, transform) => {
      const source = sourceText(node)
      const rendered = transform(source)
      originalTexts.set(node, { source, rendered })

      if (node.nodeValue !== rendered) {
        node.nodeValue = rendered
      }
    }

    const restoreText = (node) => {
      const stored = originalTexts.get(node)

      if (!stored) {
        return
      }

      if (node.nodeValue === stored.rendered) {
        node.nodeValue = stored.source
      }

      originalTexts.delete(node)
    }

    const readSelf = () => {
      try {
        return normalize((() => {${readSelf}      })())
      } catch {
        return ''
      }
    }

    const seatName = (side) => {
      try {
        return normalize((() => {${readSeat}      })())
      } catch {
        return ''
      }
    }

    const markLinks = (self, them, opponentHidden, ratingsHidden) => {
      try {${markLinks}      } catch {}
    }

    const update = () => {
      const self = readSelf()
      const top = seatName('top')
      const bottom = seatName('bottom')
      const onTop = Boolean(self) && self === top
      const onBottom = Boolean(self) && self === bottom
      const seated = onTop !== onBottom

      markLinks(
        self,
        opponentEnabled && seated ? (onTop ? bottom : top) : '',
        opponentEnabled,
        ratingsEnabled
      )

      if (!opponentEnabled || !seated) {
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

    const relevantMutation = (mutation) => {
      if (mutation.type === 'childList') {
        const touchesWatchedElement = (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            return Boolean(node.parentElement && node.parentElement.closest(WATCH_SELECTOR))
          }

          return (
            node instanceof Element &&
            (node.matches(WATCH_SELECTOR) || Boolean(node.querySelector(WATCH_SELECTOR)))
          )
        }

        const target =
          mutation.target.nodeType === Node.TEXT_NODE
            ? mutation.target.parentElement
            : mutation.target

        return (
          (target instanceof Element && Boolean(target.closest(WATCH_SELECTOR))) ||
          [...mutation.addedNodes, ...mutation.removedNodes].some(touchesWatchedElement)
        )
      }

      const target =
        mutation.target.nodeType === Node.TEXT_NODE
          ? mutation.target.parentElement
          : mutation.target

      if (!(target instanceof Element)) {
        return false
      }

      if (mutation.attributeName === 'class') {
        const classNames = (
          (mutation.oldValue || '') +
          ' ' +
          (target.getAttribute('class') || '')
        ).split(/\\s+/)
        return WATCH_CLASSES.some((className) => classNames.includes(className))
      }

      if (mutation.attributeName === 'data-user') {
        return target === document.body
      }

      return Boolean(target.closest(WATCH_SELECTOR))
    }

    window.__chessDesktopAnonymity = (opponentHidden, ratingsHidden) => {
      opponentEnabled = Boolean(opponentHidden)
      ratingsEnabled = Boolean(ratingsHidden)

      if (!opponentEnabled && !ratingsEnabled) {
        if (observer) {
          observer.disconnect()
          observer = null
        }

        if (frame) {
          cancelAnimationFrame(frame)
          frame = 0
        }

        markLinks('', '', false, false)
        document.documentElement.removeAttribute(MARKER)
        return
      }

      update()

      if (!observer) {
        observer = new MutationObserver((mutations) => {
          if (mutations.some(relevantMutation)) {
            schedule()
          }
        })
        observer.observe(document.documentElement, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeFilter: ['class', 'data-user', 'href'],
          attributeOldValue: true
        })
      }
    }
  }

  window.__chessDesktopAnonymity(${OPPONENT_HIDDEN_TOKEN}, ${RATINGS_HIDDEN_TOKEN})
})()
`
}

const ANONYMITY_CSS: Record<SiteId, string> = {
  chesscom: buildCSS(ANONYMITY.chesscom),
  lichess: buildCSS(ANONYMITY.lichess)
}

const RATING_CSS: Record<SiteId, string> = {
  chesscom: buildRatingCSS(ANONYMITY.chesscom),
  lichess: buildRatingCSS(ANONYMITY.lichess)
}

const ANONYMITY_SCRIPTS: Record<SiteId, string> = {
  chesscom: buildScript(ANONYMITY.chesscom),
  lichess: buildScript(ANONYMITY.lichess)
}

const insertedStyles = new WeakMap<WebContents, string>()
const operationVersions = new WeakMap<WebContents, number>()
const appliedSettings = new WeakMap<
  WebContents,
  { siteId: SiteId; opponentHidden: boolean; ratingsHidden: boolean }
>()

export function applyPlayerAnonymity(
  contents: WebContents | null,
  siteId: SiteId,
  opponentHidden: boolean,
  ratingsHidden: boolean,
  refresh = false
): void {
  if (!contents || contents.isDestroyed()) {
    return
  }

  const applied = appliedSettings.get(contents)
  if (
    !refresh &&
    applied?.siteId === siteId &&
    applied.opponentHidden === opponentHidden &&
    applied.ratingsHidden === ratingsHidden
  ) {
    return
  }

  appliedSettings.set(contents, { siteId, opponentHidden, ratingsHidden })

  const version = (operationVersions.get(contents) ?? 0) + 1
  operationVersions.set(contents, version)

  const previousKey = insertedStyles.get(contents)
  insertedStyles.delete(contents)

  if (previousKey) {
    contents.removeInsertedCSS(previousKey).catch(() => null)
  }

  contents
    .executeJavaScript(
      ANONYMITY_SCRIPTS[siteId]
        .replace(OPPONENT_HIDDEN_TOKEN, String(opponentHidden))
        .replace(RATINGS_HIDDEN_TOKEN, String(ratingsHidden)),
      true
    )
    .catch(() => null)

  if (!opponentHidden && !ratingsHidden) {
    return
  }

  const css = [opponentHidden ? ANONYMITY_CSS[siteId] : '', ratingsHidden ? RATING_CSS[siteId] : '']
    .filter(Boolean)
    .join('\n\n')

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
