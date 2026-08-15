import type { WebContents } from 'electron'
import type { SiteId } from '../shared/sites'
import { InsertedCss } from './inserted-css'
import { type AnonymityAdapter, getSiteAdapter } from './site-adapters'
import { SELF_MARKER } from './site-adapters/types'

const OPPONENT_HIDDEN_TOKEN = '__OPPONENT_HIDDEN__'
const RATINGS_HIDDEN_TOKEN = '__RATINGS_HIDDEN__'
const SIDES = ['top', 'bottom'] as const

function declare(selectors: readonly string[], body: string): string {
  return `${selectors.join(',\n')} {\n  ${body}\n}`
}

function buildCSS({
  seatPrefix,
  ratingSelectors,
  rules,
  linkRules = [],
}: AnonymityAdapter): string {
  const seated = [...rules, { selectors: ratingSelectors, body: 'display: none !important;' }].map(
    ({ selectors, body }) =>
      declare(
        SIDES.flatMap((side) =>
          selectors.map(
            (selector) => `html:not([${SELF_MARKER}="${side}"]) ${seatPrefix}${side} ${selector}`,
          ),
        ),
        body,
      ),
  )

  const linked = linkRules.map(({ selectors, body }) => declare(selectors, body))

  return [...seated, ...linked].join('\n\n')
}

function buildRatingCSS({
  seatPrefix,
  ratingSelectors,
  additionalRatingSelectors,
}: AnonymityAdapter): string {
  return declare(
    [
      ...SIDES.flatMap((side) =>
        ratingSelectors.map((selector) => `${seatPrefix}${side} ${selector}`),
      ),
      ...additionalRatingSelectors,
    ],
    'display: none !important;',
  )
}

function buildScript({
  readSelf,
  readSeat,
  markLinks = '',
  watchSelector,
  watchClasses,
}: AnonymityAdapter): string {
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

const styles = new InsertedCss()
const appliedSettings = new WeakMap<
  WebContents,
  { siteId: SiteId; opponentHidden: boolean; ratingsHidden: boolean }
>()

export function applyPlayerAnonymity(
  contents: WebContents | null,
  siteId: SiteId,
  opponentHidden: boolean,
  ratingsHidden: boolean,
  refresh = false,
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

  const styleVersion = styles.start(contents)
  const adapter = getSiteAdapter(siteId)
  const enabled = adapter.capabilities.playerAnonymity
  const anonymity = adapter.anonymity

  contents
    .executeJavaScript(
      buildScript(anonymity)
        .replace(OPPONENT_HIDDEN_TOKEN, String(enabled && opponentHidden))
        .replace(RATINGS_HIDDEN_TOKEN, String(enabled && ratingsHidden)),
      true,
    )
    .catch(() => null)

  const css = [
    enabled && opponentHidden ? buildCSS(anonymity) : '',
    enabled && ratingsHidden ? buildRatingCSS(anonymity) : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  if (css) {
    styles.insert(contents, styleVersion, css)
  }
}
