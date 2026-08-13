import { OPPONENT_LINK_MARKER, type OpponentRule, type SiteAdapter } from './types'

const PLACEHOLDER_AVATAR = 'https://www.chess.com/bundles/web/images/black_400.png'
const USERNAME = '[data-test-element="user-tagline-username"]'

const PLACEHOLDER_AVATAR_BODY = [
  'background-color: rgba(128, 128, 128, 0.25);',
  `background-image: url("${PLACEHOLDER_AVATAR}");`,
  'background-size: cover;',
  'background-position: center;',
  'background-repeat: no-repeat;'
].join('\n  ')

const SELF_SOURCES = [
  '#nav-user-dropdown a[href*="/member/"]',
  '.nav-user-username',
  'nav.sidebar-container a[href*="/member/"]',
  'nav a[href*="/member/"]',
  'header a[href*="/member/"]'
] as const

const READ_SELF = `
      const SELF_SOURCES = ${JSON.stringify(SELF_SOURCES)}

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

const READ_SEAT = `
      const node = document.querySelector('.player-' + side + ' ${USERNAME}')
      return node ? node.textContent : ''
`

const CHAT_AUTHOR = '.user-username-component'
const CHAT_TAGLINE = `.user-tagline-chat-component[${OPPONENT_LINK_MARKER}]`
const GAME_MESSAGES = [
  '.game-start-message-component',
  '.game-over-message-component',
  '.game-rate-sport-message-component'
] as const
const MESSAGE_OPPONENT = GAME_MESSAGES.map(
  (selector) => `${selector} a.user-username[${OPPONENT_LINK_MARKER}]`
)

const MARK_LINKS = `
        for (const node of document.querySelectorAll('.chat-message-component ${CHAT_AUTHOR}')) {
          const tagline = node.closest('.user-tagline-chat-component') || node
          const name = normalize((node.textContent || '').replace(/:\\s*$/, ''))

          if (them && name === them) {
            tagline.setAttribute(${JSON.stringify(OPPONENT_LINK_MARKER)}, '')
          } else {
            tagline.removeAttribute(${JSON.stringify(OPPONENT_LINK_MARKER)})
          }
        }

        const messageSelector = ${JSON.stringify(GAME_MESSAGES.join(', '))}
        const messageUserSelector = ${JSON.stringify(
          GAME_MESSAGES.map((selector) => `${selector} a.user-username`).join(', ')
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

const LINK_RULES: readonly OpponentRule[] = [
  {
    selectors: [`${CHAT_TAGLINE} .user-tagline-chat-flair`, `${CHAT_TAGLINE} .flair-rpc-component`],
    body: 'display: none !important;'
  },
  {
    selectors: [`${CHAT_TAGLINE} ${CHAT_AUTHOR}`],
    body: 'font-size: 0 !important;'
  },
  {
    selectors: [`${CHAT_TAGLINE} ${CHAT_AUTHOR}::after`],
    body: "content: 'Opponent:'; font-size: 14px;"
  },
  {
    selectors: MESSAGE_OPPONENT,
    body: 'font-size: 0 !important;'
  },
  {
    selectors: MESSAGE_OPPONENT.map((selector) => `${selector}::after`),
    body: "content: 'Opponent'; font-size: 14px;"
  }
]

export const chessComAdapter: SiteAdapter = {
  id: 'chesscom',
  capabilities: {
    chatVisibility: true,
    playerAnonymity: true,
    numberedArrows: true,
    reviewOnLichess: true
  },
  chatHiddenCss:
    '.resizable-chat-area-component, [data-tab="GameViewTab.Chat"] { display: none !important; }',
  gameRole: {
    ready:
      'wc-chess-board, #board-layout-chessboard, [class*="board-layout"], [class*="chessboard"]',
    player:
      '[aria-label="Resign" i], [aria-label="Abort" i], [aria-label="Draw" i], [aria-label="Undo" i], [aria-label="Takeback" i], [class*="resign-button"], [class*="draw-button"], [class*="abort-button"]',
    finished: null,
    result: null
  },
  anonymity: {
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
      { selectors: [USERNAME], body: 'font-size: 0 !important;' },
      {
        selectors: [`${USERNAME}::after`],
        body: "content: 'Opponent'; font-size: 14px;"
      }
    ],
    linkRules: LINK_RULES,
    readSelf: READ_SELF,
    readSeat: READ_SEAT,
    markLinks: MARK_LINKS,
    watchSelector: [
      ...SELF_SOURCES,
      USERNAME,
      `.chat-message-component ${CHAT_AUTHOR}`,
      ...GAME_MESSAGES
    ].join(', '),
    watchClasses: ['player-top', 'player-bottom']
  }
}
