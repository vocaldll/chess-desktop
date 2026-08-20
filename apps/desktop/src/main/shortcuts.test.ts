import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC } from '../shared/ipc-channels'
import { defaultSettings } from '../shared/settings'

const mocks = vi.hoisted(() => ({
  appOn: vi.fn(),
  ipcOn: vi.fn(),
  getSettings: vi.fn(),
}))

vi.mock('electron', () => ({
  app: { on: mocks.appOn },
  ipcMain: { on: mocks.ipcOn },
}))
vi.mock('./store', () => ({ getSettings: mocks.getSettings }))

import { registerShortcuts } from './shortcuts'

type Handler = (...args: unknown[]) => void

class FakeContents {
  readonly handlers = new Map<string, Handler>()

  constructor(
    readonly id: number,
    private readonly type = 'window',
  ) {}

  getType(): string {
    return this.type
  }

  on(event: string, handler: Handler): this {
    this.handlers.set(event, handler)
    return this
  }

  emit(event: string, ...args: unknown[]): void {
    this.handlers.get(event)?.(...args)
  }
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    type: 'keyDown',
    key: 'm',
    control: true,
    alt: false,
    shift: false,
    meta: false,
    isAutoRepeat: false,
    ...overrides,
  }
}

function setup() {
  const renderer = new FakeContents(1)
  const send = vi.fn()
  const window = {
    webContents: { id: renderer.id, send },
    isFullScreen: vi.fn().mockReturnValue(false),
    setFullScreen: vi.fn(),
  }
  registerShortcuts(() => window as never)

  const created = mocks.appOn.mock.calls.find(([event]) => event === 'web-contents-created')?.[1]
  const recording = mocks.ipcOn.mock.calls.find(
    ([channel]) => channel === IPC.shortcuts.recording,
  )?.[1]
  if (!created || !recording) {
    throw new Error('Shortcut handlers were not registered')
  }

  created({}, renderer)
  return { renderer, recording, send, window }
}

describe('shortcut interception', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSettings.mockReturnValue(defaultSettings)
  })

  it('routes matching shortcuts to the renderer', () => {
    const { renderer, send } = setup()
    const event = { preventDefault: vi.fn() }

    renderer.emit('before-input-event', event, input())

    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(send).toHaveBeenCalledWith(IPC.shortcuts.triggered, 'toggle-mute')
  })

  it.each([
    ['1', 'switch-chesscom'],
    ['2', 'switch-lichess'],
  ] as const)('routes Ctrl+%s to %s', (key, command) => {
    const { renderer, send } = setup()
    const event = { preventDefault: vi.fn() }

    renderer.emit('before-input-event', event, input({ key }))

    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(send).toHaveBeenCalledWith(IPC.shortcuts.triggered, command)
  })

  it.each([{ type: 'keyUp' }, { isAutoRepeat: true }, { meta: true }, { key: 'x' }])(
    'ignores unsupported input %#',
    (overrides) => {
      const { renderer, send } = setup()
      const event = { preventDefault: vi.fn() }

      renderer.emit('before-input-event', event, input(overrides))

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(send).not.toHaveBeenCalled()
    },
  )

  it('toggles fullscreen locally and only exits when fullscreen', () => {
    const { renderer, send, window } = setup()
    const event = { preventDefault: vi.fn() }

    renderer.emit('before-input-event', event, input({ key: 'F11', control: false }))
    expect(window.setFullScreen).toHaveBeenCalledWith(true)

    renderer.emit('before-input-event', event, input({ key: 'Escape', control: false }))
    expect(window.setFullScreen).toHaveBeenCalledOnce()

    window.isFullScreen.mockReturnValue(true)
    renderer.emit('before-input-event', event, input({ key: 'Escape', control: false }))
    expect(window.setFullScreen).toHaveBeenLastCalledWith(false)
    expect(send).not.toHaveBeenCalled()
  })

  it('suppresses shortcuts while the trusted renderer records a binding', () => {
    const { renderer, recording, send, window } = setup()
    const event = { preventDefault: vi.fn() }

    recording({ sender: { id: 999 } }, true)
    renderer.emit('before-input-event', event, input())
    expect(send).toHaveBeenCalledOnce()

    send.mockClear()
    recording({ sender: window.webContents }, true)
    renderer.emit('before-input-event', event, input())
    expect(send).not.toHaveBeenCalled()

    renderer.emit('did-start-loading')
    renderer.emit('before-input-event', event, input())
    expect(send).toHaveBeenCalledOnce()
  })

  it('ignores unrelated web contents types', () => {
    setup()
    const created = mocks.appOn.mock.calls.find(([event]) => event === 'web-contents-created')?.[1]
    const devtools = new FakeContents(3, 'remote')

    created({}, devtools)

    expect(devtools.handlers.size).toBe(0)
  })
})
