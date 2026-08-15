import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC } from '../shared/ipc-channels'
import type { DesktopApi } from './index'

const mocks = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  hookupSentryIpc: vi.fn(),
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  send: vi.fn(),
}))

vi.mock('@sentry/electron/preload-namespaced', () => ({ hookupIpc: mocks.hookupSentryIpc }))

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: mocks.exposeInMainWorld },
  ipcRenderer: {
    invoke: mocks.invoke,
    on: mocks.on,
    removeListener: mocks.removeListener,
    send: mocks.send,
  },
}))

await import('./index')

const exposedName = mocks.exposeInMainWorld.mock.calls[0]?.[0]
const api = mocks.exposeInMainWorld.mock.calls[0]?.[1] as DesktopApi
const sentryIpcWasHookedUp = mocks.hookupSentryIpc.mock.calls.length === 1

describe('preload API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exposes only the desktop API namespace', () => {
    expect(sentryIpcWasHookedUp).toBe(true)
    expect(exposedName).toBe('api')
    expect(api).toBeDefined()
    expect(Object.keys(api).sort()).toEqual([
      'activeGame',
      'audio',
      'links',
      'reviewOnLichess',
      'settings',
      'shortcuts',
      'updates',
      'webview',
      'window',
    ])
  })

  it('routes commands through their fixed IPC channels', async () => {
    mocks.invoke.mockResolvedValue({})

    api.window.minimize()
    api.window.toggleMaximize()
    api.window.close()
    api.shortcuts.setRecording(true)
    api.audio.setVolume(45)
    api.links.openRepository()
    api.updates.install()
    await api.window.isMaximized()
    await api.activeGame.isPlaying()
    await api.settings.getAll()
    await api.settings.set('soundMuted', true)
    await api.webview.getLastSiteUrls()
    await api.reviewOnLichess.start('[Event "Live Chess"]')
    await api.updates.getInfo()
    await api.updates.check()

    expect(mocks.send.mock.calls).toEqual([
      [IPC.window.minimize],
      [IPC.window.toggleMaximize],
      [IPC.window.close],
      [IPC.shortcuts.recording, true],
      [IPC.audio.setVolume, 45],
      [IPC.links.openRepository],
      [IPC.updates.install],
    ])
    expect(mocks.invoke.mock.calls).toEqual([
      [IPC.window.isMaximized],
      [IPC.activeGame.isPlaying],
      [IPC.settings.getAll],
      [IPC.settings.set, 'soundMuted', true],
      [IPC.webview.getLastSiteUrls],
      [IPC.reviewOnLichess.start, '[Event "Live Chess"]'],
      [IPC.updates.info],
      [IPC.updates.check],
    ])
  })

  it('subscribes, forwards payloads, and removes the exact listener', () => {
    const listener = vi.fn()
    const unsubscribe = api.updates.onDownloaded(listener)
    const handler = mocks.on.mock.calls[0]?.[1]

    handler({}, '2.0.0')
    expect(listener).toHaveBeenCalledWith('2.0.0')

    unsubscribe()
    expect(mocks.removeListener).toHaveBeenCalledWith(IPC.updates.downloaded, handler)
  })
})
