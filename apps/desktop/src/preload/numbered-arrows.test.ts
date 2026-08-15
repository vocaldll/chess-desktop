import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ ipcRenderer: { on: vi.fn() } }))

import { NumberedArrowsController } from './numbered-arrows'

let controller: NumberedArrowsController | null = null

function rect(left = 0, top = 0, width = 800, height = width): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  }
}

function setBounds(element: Element, bounds = rect()): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(bounds)
}

function setScreenMatrix(element: Element, matrix: Partial<DOMMatrix> = {}): void {
  Object.defineProperty(element, 'getScreenCTM', {
    configurable: true,
    value: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, ...matrix }),
  })
}

function chesscomArrow(id: string): SVGPolygonElement {
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
  polygon.setAttribute('class', 'arrow')
  polygon.setAttribute('data-arrow', id)
  polygon.setAttribute(
    'points',
    '0 0, 0 21.875, 9.375 21.875, 9.375 23.75, 13.875 20.5, 9.375 17.25, 9.375 19.125, 2.75 19.125, 2.75 0',
  )
  return polygon
}

function lichessArrow(id: string, x2: number): SVGGElement {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  group.setAttribute('cgHash', id)
  line.setAttribute('x1', '0')
  line.setAttribute('y1', '0')
  line.setAttribute('x2', String(x2))
  line.setAttribute('y2', '0')
  line.setAttribute('stroke-width', '0.2')
  line.setAttribute('marker-end', 'url(#arrowhead-g)')
  setScreenMatrix(line, { a: 100, d: 100 })
  group.append(line)
  return group
}

function labels(): SVGTextElement[] {
  return [...document.querySelectorAll<SVGTextElement>('[data-arrow-number]')]
}

afterEach(() => {
  controller?.destroy()
  controller = null
  document.body.innerHTML = ''
})

describe('numbered native arrows', () => {
  it('uses the rendered Chess.com arrowhead instead of mouse coordinates', async () => {
    document.body.innerHTML = `
      <wc-chess-board class="board">
        <svg class="arrows"></svg>
      </wc-chess-board>
    `
    const board = document.querySelector('wc-chess-board') as HTMLElement
    const layer = document.querySelector('svg.arrows') as SVGSVGElement
    setBounds(board, rect(100, 50))
    setBounds(layer, rect(100, 50))

    controller = new NumberedArrowsController(document)
    controller.configure({ enabled: true, siteId: 'chesscom' })

    board.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 2, clientX: 790, clientY: 790 }),
    )
    const arrow = chesscomArrow('b1c3')
    setScreenMatrix(arrow, { a: 2, d: 2, e: 100, f: 50 })
    layer.append(arrow)
    board.dispatchEvent(
      new MouseEvent('mouseup', { bubbles: true, button: 2, clientX: 5, clientY: 5 }),
    )

    await vi.waitFor(() => expect(labels()).toHaveLength(1))
    expect(Number(labels()[0].getAttribute('x'))).toBeCloseTo(21.75, 8)
    expect(Number(labels()[0].getAttribute('y'))).toBeCloseTo(41, 8)
  })

  it('numbers native arrows in their rendered order and renumbers removals', async () => {
    document.body.innerHTML = `
      <wc-chess-board class="board">
        <svg class="arrows"></svg>
      </wc-chess-board>
    `
    const board = document.querySelector('wc-chess-board') as HTMLElement
    const layer = document.querySelector('svg.arrows') as SVGSVGElement
    const first = chesscomArrow('a1a4')
    const second = chesscomArrow('b1c3')
    setBounds(board)
    setBounds(layer)
    setScreenMatrix(first)
    setScreenMatrix(second, { e: 100 })
    layer.append(first, second)

    controller = new NumberedArrowsController(document)
    controller.configure({ enabled: true, siteId: 'chesscom' })

    expect(labels().map((label) => label.textContent)).toEqual(['1', '2'])

    first.remove()
    await vi.waitFor(() => expect(labels().map((label) => label.textContent)).toEqual(['1']))
    expect(labels()[0].getAttribute('x')).toBe(String(110.875))
  })

  it('renders a readable numeral directly inside the arrowhead', () => {
    document.body.innerHTML = `
      <wc-chess-board class="board">
        <svg class="arrows"></svg>
      </wc-chess-board>
    `
    const board = document.querySelector('wc-chess-board') as HTMLElement
    const layer = document.querySelector('svg.arrows') as SVGSVGElement
    const arrow = chesscomArrow('a1a4')
    setBounds(board)
    setBounds(layer)
    setScreenMatrix(arrow)
    layer.append(arrow)

    controller = new NumberedArrowsController(document)
    controller.configure({ enabled: true, siteId: 'chesscom' })

    expect(document.querySelector('circle')).toBeNull()
    expect(labels()[0].getAttribute('font-size')).toBe('24')
    expect(labels()[0].getAttribute('fill')).toBe('#fff')
    expect(labels()[0].getAttribute('stroke')).toBe('#000')
    expect(labels()[0].getAttribute('stroke-width')).toBe('2.88')
    expect(labels()[0].getAttribute('stroke-linejoin')).toBe('round')
  })

  it('uses Lichess line geometry and ignores non-user brushes', () => {
    document.body.innerHTML = `
      <cg-container>
        <cg-board></cg-board>
        <svg class="cg-shapes">
          <g>
            <g cgHash="800,800,1,a1,a2,green"><line x1="0" y1="0" x2="2" y2="0" stroke-width="0.2" marker-end="url(#arrowhead-g)"></line></g>
            <g cgHash="800,800,1,b1,b2,green"><line x1="0" y1="0" x2="5" y2="0" stroke-width="0.2" marker-end="url(#arrowhead-pg)"></line></g>
          </g>
        </svg>
      </cg-container>
    `
    const board = document.querySelector('cg-board') as HTMLElement
    const layer = document.querySelector('svg.cg-shapes') as SVGSVGElement
    const lines = document.querySelectorAll('line')
    setBounds(board, rect(400, 100))
    setBounds(layer, rect(400, 100))
    setScreenMatrix(lines[0], { a: 100, d: 100, e: 400, f: 100 })
    setScreenMatrix(lines[1], { a: 100, d: 100, e: 400, f: 100 })

    controller = new NumberedArrowsController(document)
    controller.configure({ enabled: true, siteId: 'lichess' })

    expect(labels()).toHaveLength(1)
    expect(Number(labels()[0].getAttribute('x'))).toBeCloseTo(179, 8)
    expect(labels()[0].getAttribute('y')).toBe('0')
  })

  it('preserves first-drawn Lichess numbering when the native SVG reorders its arrows', async () => {
    document.body.innerHTML = `
      <cg-container>
        <cg-board></cg-board>
        <svg class="cg-shapes"><g></g></svg>
      </cg-container>
    `
    const board = document.querySelector('cg-board') as HTMLElement
    const layer = document.querySelector('svg.cg-shapes') as SVGSVGElement
    const shapes = layer.querySelector('g') as SVGGElement
    const first = lichessArrow('800,800,1,a1,a2,green', 2)
    const second = lichessArrow('800,800,1,b1,b2,green', 4)
    setBounds(board)
    setBounds(layer)
    shapes.append(first, second)

    controller = new NumberedArrowsController(document)
    controller.configure({ enabled: true, siteId: 'lichess' })

    expect(labels().map((label) => label.getAttribute('x'))).toEqual(['179', '379'])

    first.setAttribute('cgHash', '760,760,2,a1,a2,green')
    second.setAttribute('cgHash', '760,760,2,b1,b2,green')
    shapes.prepend(second)
    await vi.waitFor(() => {
      expect(labels().map((label) => label.getAttribute('x'))).toEqual(['179', '379'])
    })

    first.remove()
    await vi.waitFor(() => expect(labels()).toHaveLength(1))
    expect(labels()[0].textContent).toBe('1')
    expect(labels()[0].getAttribute('x')).toBe('379')
  })

  it('numbers Lichess arrows that share a shortened destination square', () => {
    document.body.innerHTML = `
      <cg-container>
        <cg-board></cg-board>
        <svg class="cg-shapes"><g></g></svg>
      </cg-container>
    `
    const board = document.querySelector('cg-board') as HTMLElement
    const layer = document.querySelector('svg.cg-shapes') as SVGSVGElement
    const shapes = layer.querySelector('g') as SVGGElement
    setBounds(board)
    setBounds(layer)
    shapes.append(
      lichessArrow('800,800,2,d3,e4,green,-', 2),
      lichessArrow('800,800,2,f3,e4,green,-', 4),
    )

    controller = new NumberedArrowsController(document)
    controller.configure({ enabled: true, siteId: 'lichess' })

    expect(labels().map((label) => label.textContent)).toEqual(['1', '2'])
    expect(labels().map((label) => label.getAttribute('x'))).toEqual(['179', '379'])
  })

  it('keeps Lichess numbering when an overlapping arrowhead shortens existing shapes', async () => {
    document.body.innerHTML = `
      <cg-container>
        <cg-board></cg-board>
        <svg class="cg-shapes"><g></g></svg>
      </cg-container>
    `
    const board = document.querySelector('cg-board') as HTMLElement
    const layer = document.querySelector('svg.cg-shapes') as SVGSVGElement
    const shapes = layer.querySelector('g') as SVGGElement
    const first = lichessArrow('800,800,1,e2,e4,green', 2)
    const second = lichessArrow('800,800,1,g1,f3,green', 4)
    setBounds(board)
    setBounds(layer)
    shapes.append(first, second)

    controller = new NumberedArrowsController(document)
    controller.configure({ enabled: true, siteId: 'lichess' })

    expect(labels().map((label) => label.textContent)).toEqual(['1', '2'])

    first.setAttribute('cgHash', '800,800,2,e2,e4,green,-')
    shapes.append(lichessArrow('800,800,2,d3,e4,green,-', 6), first)

    await vi.waitFor(() => expect(labels()).toHaveLength(3))
    expect(labels().map((label) => label.textContent)).toEqual(['1', '2', '3'])
    expect(labels().map((label) => label.getAttribute('x'))).toEqual(['179', '379', '579'])
  })

  it('keeps 30 Lichess arrows stable through a complete resize redraw', async () => {
    document.body.innerHTML = `
      <cg-container>
        <cg-board></cg-board>
        <svg class="cg-shapes"><g></g></svg>
      </cg-container>
    `
    const board = document.querySelector('cg-board') as HTMLElement
    const layer = document.querySelector('svg.cg-shapes') as SVGSVGElement
    const shapes = layer.querySelector('g') as SVGGElement
    const key = (index: number) => {
      const square = (value: number) =>
        `${String.fromCharCode(97 + (value % 8))}${8 - Math.floor(value / 8)}`
      return `${square(index)},${square((index * 7 + 13) % 64)},green`
    }
    const arrows = Array.from({ length: 30 }, (_, index) =>
      lichessArrow(`800,800,1,${key(index)}`, index + 1),
    )
    setBounds(board)
    setBounds(layer)
    shapes.append(...arrows)

    controller = new NumberedArrowsController(document)
    controller.configure({ enabled: true, siteId: 'lichess' })
    const initialPositions = labels().map((label) => label.getAttribute('x'))

    for (const [index, arrow] of arrows.entries()) {
      arrow.setAttribute('cgHash', `760,760,2,${key(index)}`)
    }
    shapes.append(...[...arrows].reverse())

    await vi.waitFor(() => {
      expect(labels().map((label) => label.textContent)).toEqual(
        Array.from({ length: 30 }, (_, index) => String(index + 1)),
      )
      expect(labels().map((label) => label.getAttribute('x'))).toEqual(initialPositions)
    })
  })

  it('resumes numbering when the drawing button is released outside the window', async () => {
    document.body.innerHTML = `
      <wc-chess-board class="board">
        <svg class="arrows"></svg>
      </wc-chess-board>
    `
    const board = document.querySelector('wc-chess-board') as HTMLElement
    const layer = document.querySelector('svg.arrows') as SVGSVGElement
    setBounds(board)
    setBounds(layer)

    controller = new NumberedArrowsController(document)
    controller.configure({ enabled: true, siteId: 'chesscom' })

    board.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 2, buttons: 2 }))
    const arrow = chesscomArrow('a1a4')
    setScreenMatrix(arrow)
    layer.append(arrow)

    await vi.waitFor(() => expect(layer.contains(arrow)).toBe(true))
    expect(labels()).toHaveLength(0)

    board.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 0 }))

    await vi.waitFor(() => expect(labels()).toHaveLength(1))
    expect(labels()[0].textContent).toBe('1')
  })

  it('removes labels when the setting is disabled', () => {
    document.body.innerHTML = `
      <wc-chess-board class="board">
        <svg class="arrows"></svg>
      </wc-chess-board>
    `
    const board = document.querySelector('wc-chess-board') as HTMLElement
    const layer = document.querySelector('svg.arrows') as SVGSVGElement
    const arrow = chesscomArrow('a1a4')
    setBounds(board)
    setBounds(layer)
    setScreenMatrix(arrow)
    layer.append(arrow)

    controller = new NumberedArrowsController(document)
    controller.configure({ enabled: true, siteId: 'chesscom' })
    controller.configure({ enabled: false, siteId: 'chesscom' })

    expect(labels()).toHaveLength(0)
  })
})
