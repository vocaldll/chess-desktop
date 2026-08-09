import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  appOn: vi.fn(),
  buildFromTemplate: vi.fn(),
  popup: vi.fn(),
  openExternal: vi.fn(),
  writeText: vi.fn(),
  getSiteWebContents: vi.fn()
}))

vi.mock('electron', () => ({
  app: { on: mocks.appOn },
  clipboard: { writeText: mocks.writeText },
  Menu: { buildFromTemplate: mocks.buildFromTemplate },
  shell: { openExternal: mocks.openExternal }
}))
vi.mock('./webview', () => ({ getSiteWebContents: mocks.getSiteWebContents }))

import { registerContextMenus } from './context-menu'

type Item = {
  label?: string
  type?: string
  enabled?: boolean
  click?: () => void
}

type Handler = (...args: unknown[]) => void

class FakeContents {
  readonly handlers = new Map<string, Handler>()
  readonly cut = vi.fn()
  readonly copy = vi.fn()
  readonly paste = vi.fn()
  readonly selectAll = vi.fn()

  constructor(private readonly type: string) {}

  getType(): string {
    return this.type
  }

  on(event: string, handler: Handler): this {
    this.handlers.set(event, handler)
    return this
  }
}

function create(
  contents: FakeContents,
  getWindow: () => { id: string } | null = () => ({ id: 'window' })
) {
  registerContextMenus(getWindow as never)
  const created = mocks.appOn.mock.calls.find(([event]) => event === 'web-contents-created')?.[1]
  if (!created) {
    throw new Error('Context menu handler was not registered')
  }
  created({}, contents)
  return contents.handlers.get('context-menu')
}

function params(overrides: Record<string, unknown> = {}) {
  return {
    isEditable: false,
    editFlags: {
      canCut: false,
      canCopy: false,
      canPaste: false,
      canSelectAll: false
    },
    selectionText: '',
    linkURL: '',
    ...overrides
  }
}

function template(): Item[] {
  return mocks.buildFromTemplate.mock.calls[0][0] as Item[]
}

describe('context menus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.buildFromTemplate.mockReturnValue({ popup: mocks.popup })
    mocks.openExternal.mockResolvedValue(undefined)
  })

  it('builds editable commands and opens the current site page externally', () => {
    const contents = new FakeContents('window')
    mocks.getSiteWebContents.mockReturnValue({
      getURL: () => 'https://www.chess.com/game/123'
    })
    const onContextMenu = create(contents)

    onContextMenu?.(
      {},
      params({
        isEditable: true,
        editFlags: { canCut: true, canCopy: true, canPaste: false, canSelectAll: true }
      })
    )

    const items = template()
    expect(items.filter((item) => item.label).map((item) => item.label)).toEqual([
      'Open in browser',
      'Cut',
      'Copy',
      'Paste',
      'Select all'
    ])
    items.find((item) => item.label === 'Open in browser')?.click?.()
    items.find((item) => item.label === 'Cut')?.click?.()
    items.find((item) => item.label === 'Copy')?.click?.()
    items.find((item) => item.label === 'Paste')?.click?.()
    items.find((item) => item.label === 'Select all')?.click?.()

    expect(mocks.openExternal).toHaveBeenCalledWith('https://www.chess.com/game/123')
    expect(contents.cut).toHaveBeenCalledOnce()
    expect(contents.copy).toHaveBeenCalledOnce()
    expect(contents.paste).toHaveBeenCalledOnce()
    expect(contents.selectAll).toHaveBeenCalledOnce()
    expect(items.find((item) => item.label === 'Paste')?.enabled).toBe(false)
    expect(mocks.popup).toHaveBeenCalledWith({ window: { id: 'window' } })
  })

  it('never opens unsafe links but still allows copying their address', () => {
    const contents = new FakeContents('webview')
    const onContextMenu = create(contents)

    onContextMenu?.({}, params({ linkURL: 'javascript:alert(1)' }))

    const items = template()
    expect(items.filter((item) => item.label).map((item) => item.label)).toEqual([
      'Copy link address'
    ])
    items[0].click?.()
    expect(mocks.openExternal).not.toHaveBeenCalled()
    expect(mocks.writeText).toHaveBeenCalledWith('javascript:alert(1)')
  })

  it('does not register menus for unrelated web contents', () => {
    const contents = new FakeContents('remote')

    create(contents)

    expect(contents.handlers.size).toBe(0)
  })

  it('does not show empty menus or menus without a window', () => {
    const contents = new FakeContents('webview')
    const onContextMenu = create(contents, () => null)

    onContextMenu?.({}, params())

    expect(mocks.popup).not.toHaveBeenCalled()
  })
})
