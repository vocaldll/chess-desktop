import {
  OPPONENT_LINK_MARKER,
  type OpponentRule,
  SELF_LINK_MARKER,
  type SiteAdapter,
} from './types'

const READ_SELF = `
      return document.body ? document.body.dataset.user || '' : ''
`

const READ_SEAT = `
      const node = document.querySelector('.ruser-' + side + ' a.user-link')
      const path = (node ? node.getAttribute('href') || '' : '').split('/@/')[1]
      return path ? decodeURIComponent(path.split(/[/?#]/)[0]) : ''
`

const MARK_LINKS = `
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
const LINK_SCOPES = [
  { scope: '.game__meta', link: NOT_SELF_LINK, fontSize: '0.9rem' },
  { scope: '.crosstable', link: NOT_SELF_LINK, fontSize: '1rem' },
  { scope: '.mchat', link: OPPONENT_LINK, fontSize: '0.9rem' },
]

const LINK_RULES: readonly OpponentRule[] = [
  {
    selectors: LINK_SCOPES.flatMap(({ scope, link }) =>
      ['.utitle', '.uflair', '.rating'].map((part) => `${scope} ${link} ${part}`),
    ),
    body: 'display: none !important;',
  },
  {
    selectors: LINK_SCOPES.map(({ scope, link }) => `${scope} ${link}`),
    body: 'font-size: 0 !important;',
  },
  ...LINK_SCOPES.map(({ scope, link, fontSize }) => ({
    selectors: [`${scope} ${link}::after`],
    body: `content: 'Opponent'; font-size: ${fontSize};`,
  })),
]

export const lichessAdapter: SiteAdapter = {
  id: 'lichess',
  capabilities: {
    chatVisibility: true,
    playerAnonymity: true,
    numberedArrows: true,
    reviewOnLichess: false,
  },
  chatHiddenCss: '.mchat { display: none !important; }',
  gameRole: {
    ready: 'cg-board, .cg-wrap, .round__app, .rcontrols',
    player:
      '[class*="resign"], [class*="takeback"], [class*="draw-yes"], [title*="resign" i], [title*="abort" i], [title*="takeback" i], [title*="offer draw" i], [aria-label*="resign" i], [aria-label*="abort" i], [aria-label*="takeback" i]',
    finished: '[class*="copy-me"], [class*="rematch"]',
    result: '.result-wrap .result, .status .result',
  },
  anonymity: {
    seatPrefix: '.ruser-',
    ratingSelectors: ['rating'],
    additionalRatingSelectors: [
      '.game__meta a.user-link .rating',
      '.crosstable a.user-link .rating',
    ],
    rules: [
      {
        selectors: ['.utitle', '.uflair', 'icon.line'],
        body: 'display: none !important;',
      },
      { selectors: ['a.user-link'], body: 'font-size: 0 !important;' },
      { selectors: ['a.user-link::after'], body: "content: 'Opponent'; font-size: 1.2rem;" },
    ],
    linkRules: LINK_RULES,
    readSelf: READ_SELF,
    readSeat: READ_SEAT,
    markLinks: MARK_LINKS,
    watchSelector: 'a.user-link',
    watchClasses: ['ruser-top', 'ruser-bottom'],
  },
}
