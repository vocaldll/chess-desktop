import { ipcRenderer } from 'electron'
import {
  NUMBERED_ARROWS_UPDATE_CHANNEL,
  type NumberedArrowsUpdate,
} from '../shared/numbered-arrows'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const OVERLAY_ATTRIBUTE = 'data-chess-desktop-numbered-arrows'
const RIGHT_BUTTON = 2
const RIGHT_BUTTON_HELD = 2

interface Point {
  x: number
  y: number
}

interface NativeArrow {
  anchor: Point
  element: SVGGraphicsElement
  key: string
}

interface SiteDrawingConfig {
  boardSelector: string
  layerSelector: string
  readArrows: (layer: Element) => NativeArrow[]
}

function parsePoints(value: string): Point[] {
  const values = value
    .trim()
    .split(/[\s,]+/)
    .map(Number)

  if (values.some((value) => !Number.isFinite(value)) || values.length % 2 !== 0) {
    return []
  }

  const points: Point[] = []
  for (let index = 0; index < values.length; index += 2) {
    points.push({ x: values[index], y: values[index + 1] })
  }
  return points
}

function triangleCentroid(first: Point, second: Point, third: Point): Point {
  return {
    x: (first.x + second.x + third.x) / 3,
    y: (first.y + second.y + third.y) / 3,
  }
}

function chesscomArrowheadCenter(points: Point[]): Point | null {
  if (points.length < 3) {
    return null
  }

  const tipIndex = Math.floor(points.length / 2)

  return triangleCentroid(points[tipIndex - 1], points[tipIndex], points[tipIndex + 1])
}

function readChesscomArrows(layer: Element): NativeArrow[] {
  return [...layer.querySelectorAll<SVGPolygonElement>(':scope > polygon.arrow[data-arrow]')]
    .map((polygon): NativeArrow | null => {
      const points = parsePoints(polygon.getAttribute('points') ?? '')
      const key = polygon.getAttribute('data-arrow')
      if (!key || points.length < 5) {
        return null
      }

      const anchor = chesscomArrowheadCenter(points)
      if (!anchor) {
        return null
      }

      return {
        element: polygon,
        anchor,
        key,
      }
    })
    .filter((arrow): arrow is NativeArrow => arrow !== null)
}

const LICHESS_SQUARE = /^[a-h][1-8]$/

function lichessShapeKey(hash: string | null | undefined): string | null {
  const parts = hash?.split(',') ?? []
  const origIndex = parts.findIndex(
    (part, index) => LICHESS_SQUARE.test(part) && LICHESS_SQUARE.test(parts[index + 1] ?? ''),
  )

  return origIndex === -1 ? null : parts.slice(origIndex, origIndex + 3).join(',')
}

function readLichessArrows(layer: Element): NativeArrow[] {
  return [...layer.querySelectorAll<SVGLineElement>(':scope > g > g[cgHash] line[marker-end]')]
    .filter((line) => /#arrowhead-(?:g|r|b|y)\)$/.test(line.getAttribute('marker-end') ?? ''))
    .map((line): NativeArrow | null => {
      const key = lichessShapeKey(
        line.parentElement?.getAttribute('cgHash') ?? line.parentElement?.getAttribute('cghash'),
      )
      const x1 = Number(line.getAttribute('x1'))
      const y1 = Number(line.getAttribute('y1'))
      const x2 = Number(line.getAttribute('x2'))
      const y2 = Number(line.getAttribute('y2'))
      const strokeWidth = Number(line.getAttribute('stroke-width'))
      const length = Math.hypot(x2 - x1, y2 - y1)

      if (!key || ![x1, y1, x2, y2, strokeWidth, length].every(Number.isFinite) || length === 0) {
        return null
      }

      const markerCentroidOffset = strokeWidth * 1.05
      return {
        element: line,
        key,
        anchor: {
          x: x2 - ((x2 - x1) / length) * markerCentroidOffset,
          y: y2 - ((y2 - y1) / length) * markerCentroidOffset,
        },
      }
    })
    .filter((arrow): arrow is NativeArrow => arrow !== null)
}

const SITE_CONFIG: Record<NumberedArrowsUpdate['siteId'], SiteDrawingConfig> = {
  chesscom: {
    boardSelector: 'wc-chess-board.board, wc-chess-board',
    layerSelector: 'svg.arrows',
    readArrows: readChesscomArrows,
  },
  lichess: {
    boardSelector: 'cg-board',
    layerSelector: 'svg.cg-shapes',
    readArrows: readLichessArrows,
  },
}

function isUpdate(value: unknown): value is NumberedArrowsUpdate {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const update = value as Partial<NumberedArrowsUpdate>
  return (
    typeof update.enabled === 'boolean' &&
    (update.siteId === 'chesscom' || update.siteId === 'lichess')
  )
}

function toBoardPoint(arrow: NativeArrow, boardBounds: DOMRect): Point | null {
  const matrix = arrow.element.getScreenCTM()
  if (!matrix) {
    return null
  }

  return {
    x: matrix.a * arrow.anchor.x + matrix.c * arrow.anchor.y + matrix.e - boardBounds.left,
    y: matrix.b * arrow.anchor.x + matrix.d * arrow.anchor.y + matrix.f - boardBounds.top,
  }
}

export class NumberedArrowsController {
  private enabled = false
  private siteId: NumberedArrowsUpdate['siteId'] = 'chesscom'
  private drawing = false
  private layer: Element | null = null
  private layerObserver: MutationObserver | null = null
  private resizeObserver: ResizeObserver | null = null
  private syncFrame = 0
  private arrowOrder: string[] = []

  constructor(private readonly document: Document) {
    document.addEventListener('mousedown', this.onMouseDown, true)
    document.addEventListener('mouseup', this.onMouseUp, true)
    document.addEventListener('mousemove', this.onMouseMove, true)
  }

  configure(update: NumberedArrowsUpdate): void {
    const siteChanged = this.siteId !== update.siteId
    this.siteId = update.siteId
    this.enabled = update.enabled

    if (siteChanged || !this.enabled) {
      this.reset()
    }

    if (this.enabled) {
      this.sync()
    }
  }

  destroy(): void {
    this.document.removeEventListener('mousedown', this.onMouseDown, true)
    this.document.removeEventListener('mouseup', this.onMouseUp, true)
    this.document.removeEventListener('mousemove', this.onMouseMove, true)
    this.reset()
  }

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (this.enabled && event.button === RIGHT_BUTTON) {
      this.drawing = true
    }
  }

  private readonly onMouseUp = (event: MouseEvent): void => {
    if (!this.enabled || event.button !== RIGHT_BUTTON) {
      return
    }

    this.drawing = false
    this.scheduleSync(true)
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (this.drawing && (event.buttons & RIGHT_BUTTON_HELD) === 0) {
      this.drawing = false
      this.scheduleSync(true)
    }
  }

  private scheduleSync(afterNativeRender = false): void {
    cancelAnimationFrame(this.syncFrame)
    this.syncFrame = requestAnimationFrame(() => {
      if (afterNativeRender) {
        this.syncFrame = requestAnimationFrame(() => this.sync())
      } else {
        this.sync()
      }
    })
  }

  private sync(): void {
    if (!this.enabled || this.drawing) {
      return
    }

    const config = SITE_CONFIG[this.siteId]
    const layer = this.findLargest(config.layerSelector)
    if (!layer) {
      this.removeOverlay()
      return
    }

    const board = this.findBoard(layer, config)
    if (!board) {
      this.removeOverlay()
      return
    }

    this.observe(layer, board)
    this.render(board, this.orderArrows(config.readArrows(layer)))
  }

  private orderArrows(arrows: NativeArrow[]): NativeArrow[] {
    const arrowsByKey = new Map(arrows.map((arrow) => [arrow.key, arrow]))
    const nextOrder = this.arrowOrder.filter((key) => arrowsByKey.has(key))
    const knownKeys = new Set(nextOrder)

    for (const arrow of arrows) {
      if (!knownKeys.has(arrow.key)) {
        knownKeys.add(arrow.key)
        nextOrder.push(arrow.key)
      }
    }

    this.arrowOrder = nextOrder
    return nextOrder.map((key) => arrowsByKey.get(key) as NativeArrow)
  }

  private findLargest(selector: string): Element | null {
    return (
      [...this.document.querySelectorAll(selector)].sort(
        (left, right) => right.getBoundingClientRect().width - left.getBoundingClientRect().width,
      )[0] ?? null
    )
  }

  private findBoard(layer: Element, config: SiteDrawingConfig): Element | null {
    if (this.siteId === 'chesscom') {
      return layer.closest(config.boardSelector)
    }

    return layer.parentElement?.querySelector(config.boardSelector) ?? null
  }

  private observe(layer: Element, board: Element): void {
    if (this.layer === layer) {
      return
    }

    this.disconnectObservers()
    this.layer = layer
    this.layerObserver = new MutationObserver(() => {
      if (!this.drawing) {
        this.scheduleSync()
      }
    })
    this.layerObserver.observe(layer, { childList: true, subtree: true, attributes: true })

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleSync())
      this.resizeObserver.observe(board)
    }
  }

  private render(board: Element, arrows: NativeArrow[]): void {
    this.removeOverlay()
    if (arrows.length === 0) {
      return
    }

    const bounds = board.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) {
      return
    }

    const positions = arrows
      .map((arrow) => toBoardPoint(arrow, bounds))
      .filter((point): point is Point => point !== null)
    if (positions.length === 0) {
      return
    }

    const squareSize = Math.min(bounds.width, bounds.height) / 8
    const overlay = this.document.createElementNS(SVG_NAMESPACE, 'svg')
    overlay.setAttribute(OVERLAY_ATTRIBUTE, '')
    overlay.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`)
    overlay.setAttribute('aria-hidden', 'true')
    overlay.style.cssText = [
      'position: absolute',
      'inset: 0',
      'width: 100%',
      'height: 100%',
      'overflow: visible',
      'pointer-events: none',
      'z-index: 5',
    ].join(';')

    for (const [index, position] of positions.entries()) {
      overlay.append(this.createLabel(position, index + 1, squareSize))
    }

    board.append(overlay)
  }

  private createLabel(position: Point, number: number, squareSize: number): SVGTextElement {
    const text = this.document.createElementNS(SVG_NAMESPACE, 'text')
    const fontSize = squareSize * (number > 99 ? 0.14 : number > 9 ? 0.18 : 0.24)

    text.setAttribute('data-arrow-number', String(number))
    text.setAttribute('x', String(position.x))
    text.setAttribute('y', String(position.y))
    text.setAttribute('fill', '#fff')
    text.setAttribute('font-family', 'system-ui, sans-serif')
    text.setAttribute('font-size', String(fontSize))
    text.setAttribute('font-weight', '800')
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('dominant-baseline', 'central')
    text.setAttribute('paint-order', 'stroke')
    text.setAttribute('stroke', '#000')
    text.setAttribute('stroke-width', String(fontSize * 0.12))
    text.setAttribute('stroke-linejoin', 'round')
    text.textContent = String(number)
    return text
  }

  private reset(): void {
    cancelAnimationFrame(this.syncFrame)
    this.syncFrame = 0
    this.drawing = false
    this.arrowOrder = []
    this.disconnectObservers()
    this.removeOverlay()
  }

  private disconnectObservers(): void {
    this.layerObserver?.disconnect()
    this.layerObserver = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.layer = null
  }

  private removeOverlay(): void {
    this.document.querySelector(`[${OVERLAY_ATTRIBUTE}]`)?.remove()
  }
}

export function installNumberedArrows(): NumberedArrowsController {
  const controller = new NumberedArrowsController(document)
  ipcRenderer.on(NUMBERED_ARROWS_UPDATE_CHANNEL, (_event, update: unknown) => {
    if (isUpdate(update)) {
      controller.configure(update)
    }
  })
  return controller
}
