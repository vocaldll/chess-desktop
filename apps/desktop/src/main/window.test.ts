import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC } from '../shared/ipc-channels'
import { defaultSettings } from '../shared/settings'

const mocks = vi.hoisted(() => ({
  constructWindow: vi.fn(),
  app: {
    isPackaged: false,
  },
  getDisplayMatching: vi.fn(),
  getPrimaryDisplay: vi.fn(),
  getSettings: vi.fn(),
  getWindowBounds: vi.fn(),
  setWindowBounds: vi.fn(),
}))

vi.mock('electron', () => ({
  app: mocks.app,
  BrowserWindow: class {
    readonly handlers = new Map<string, (...args: unknown[]) => void>()
    readonly webContents = { send: vi.fn() }
    readonly maximize = vi.fn()
    readonly show = vi.fn()
    readonly setAlwaysOnTop = vi.fn()
    readonly isMaximized = vi.fn().mockReturnValue(false)
    readonly isFullScreen = vi.fn().mockReturnValue(false)
    readonly getNormalBounds = vi.fn().mockReturnValue({ width: 900, height: 700, x: 10, y: 20 })
    readonly getBounds = vi.fn().mockReturnValue({ width: 1000, height: 800, x: 30, y: 40 })
    readonly loadURL = vi.fn()
    readonly loadFile = vi.fn()
    readonly once = vi.fn((event: string, handler: (...args: unknown[]) => void) =>
      this.handlers.set(event, handler),
    )
    readonly on = vi.fn((event: string, handler: (...args: unknown[]) => void) =>
      this.handlers.set(event, handler),
    )

    constructor(options: unknown) {
      mocks.constructWindow(options)
    }
  },
  screen: {
    getDisplayMatching: mocks.getDisplayMatching,
    getPrimaryDisplay: mocks.getPrimaryDisplay,
  },
}))
vi.mock('./store', () => ({
  getSettings: mocks.getSettings,
  getWindowBounds: mocks.getWindowBounds,
  setWindowBounds: mocks.setWindowBounds,
}))

import { createMainWindow } from './window'

type Handler = (...args: unknown[]) => void

function fakeWindow() {
  const handlers = new Map<string, Handler>()
  return {
    handlers,
    webContents: { send: vi.fn() },
    maximize: vi.fn(),
    show: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    isMaximized: vi.fn().mockReturnValue(false),
    isFullScreen: vi.fn().mockReturnValue(false),
    getNormalBounds: vi.fn().mockReturnValue({ width: 900, height: 700, x: 10, y: 20 }),
    getBounds: vi.fn().mockReturnValue({ width: 1000, height: 800, x: 30, y: 40 }),
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    once: vi.fn((event: string, handler: Handler) => handlers.set(event, handler)),
    on: vi.fn((event: string, handler: Handler) => handlers.set(event, handler)),
  }
}

describe('main window', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    mocks.app.isPackaged = false
    mocks.getSettings.mockReturnValue(defaultSettings)
    mocks.getWindowBounds.mockReturnValue({
      width: 1200,
      height: 900,
      x: undefined,
      y: undefined,
      isMaximized: false,
    })
    mocks.getPrimaryDisplay.mockReturnValue({
      workArea: { width: 1000, height: 700, x: 0, y: 0 },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('clamps and centers bounds while preserving secure web preferences', () => {
    const window = createMainWindow() as unknown as ReturnType<typeof fakeWindow>

    expect(mocks.constructWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 1000,
        height: 700,
        x: 0,
        y: 0,
        frame: false,
        icon: join(__dirname, '../../resources/icon.ico'),
        webPreferences: expect.objectContaining({
          webviewTag: true,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        }),
      }),
    )
    expect(window.setAlwaysOnTop).toHaveBeenCalledWith(false)
    expect(window.loadFile).toHaveBeenCalledOnce()
  })

  it('restores a fitting saved position and maximized state', () => {
    mocks.getWindowBounds.mockReturnValue({
      width: 900,
      height: 600,
      x: 100,
      y: 50,
      isMaximized: true,
    })
    mocks.getDisplayMatching.mockReturnValue({
      workArea: { width: 1600, height: 900, x: 0, y: 0 },
    })

    const window = createMainWindow() as unknown as ReturnType<typeof fakeWindow>

    expect(mocks.constructWindow).toHaveBeenCalledWith(
      expect.objectContaining({ width: 900, height: 600, x: 100, y: 50 }),
    )
    expect(window.maximize).toHaveBeenCalledOnce()
  })

  it('forwards window state events and saves restorable bounds', () => {
    const window = createMainWindow() as unknown as ReturnType<typeof fakeWindow>

    window.handlers.get('ready-to-show')?.()
    window.handlers.get('maximize')?.()
    window.handlers.get('unmaximize')?.()
    window.handlers.get('enter-full-screen')?.()
    window.handlers.get('leave-full-screen')?.()
    expect(window.show).toHaveBeenCalledOnce()
    expect(window.webContents.send.mock.calls).toEqual([
      [IPC.window.maximizeChanged, true],
      [IPC.window.maximizeChanged, false],
      [IPC.window.fullscreenChanged, true],
      [IPC.window.fullscreenChanged, false],
    ])

    window.isMaximized.mockReturnValue(true)
    window.handlers.get('close')?.()
    expect(mocks.setWindowBounds).toHaveBeenCalledWith({
      width: 900,
      height: 700,
      x: 10,
      y: 20,
      isMaximized: true,
    })
  })

  it('loads the development server when configured', () => {
    vi.stubEnv('ELECTRON_RENDERER_URL', 'http://localhost:5173')

    const window = createMainWindow() as unknown as ReturnType<typeof fakeWindow>

    expect(window.loadURL).toHaveBeenCalledWith('http://localhost:5173')
    expect(window.loadFile).not.toHaveBeenCalled()
  })

  it('lets the packaged executable provide its application icon', () => {
    mocks.app.isPackaged = true

    createMainWindow()

    expect(mocks.constructWindow).toHaveBeenCalledWith(expect.objectContaining({ icon: undefined }))
  })
})
