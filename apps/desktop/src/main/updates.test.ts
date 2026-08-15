import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC } from '../shared/ipc-channels'

const mocks = vi.hoisted(() => ({
  app: {
    isPackaged: false,
    getVersion: vi.fn(),
    on: vi.fn(),
  },
  ipcHandle: vi.fn(),
  ipcOn: vi.fn(),
  updaterOn: vi.fn(),
  checkForUpdates: vi.fn(),
  quitAndInstall: vi.fn(),
}))

vi.mock('electron', () => ({
  app: mocks.app,
  ipcMain: { handle: mocks.ipcHandle, on: mocks.ipcOn },
}))
vi.mock('electron-updater', () => ({
  autoUpdater: {
    on: mocks.updaterOn,
    checkForUpdates: mocks.checkForUpdates,
    quitAndInstall: mocks.quitAndInstall,
  },
}))

type Handler = (...args: unknown[]) => unknown

function registration(mock: ReturnType<typeof vi.fn>, name: string): Handler {
  const match = mock.mock.calls.find(([registered]) => registered === name)
  if (!match) {
    throw new Error(`Missing registration for ${name}`)
  }
  return match[1]
}

async function start(packaged: boolean) {
  mocks.app.isPackaged = packaged
  const updates = await import('./updates')
  const send = vi.fn()
  updates.startAutoUpdates(() => ({ webContents: { send } }) as never)
  return { send }
}

describe('automatic updates', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('APPIMAGE', '/tmp/Chess-Desktop.AppImage')
    mocks.app.isPackaged = false
    mocks.app.getVersion.mockReturnValue('1.2.3')
    mocks.checkForUpdates.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('reports unsupported update checks for development builds', async () => {
    await start(false)

    expect(registration(mocks.ipcHandle, IPC.updates.info)()).toEqual({
      version: '1.2.3',
      canCheck: false,
      downloadedVersion: null,
    })
    await expect(registration(mocks.ipcHandle, IPC.updates.check)()).resolves.toEqual({
      status: 'unsupported',
    })
    expect(mocks.updaterOn).not.toHaveBeenCalled()
  })

  it('reports current, available, and failed update checks', async () => {
    await start(true)
    const check = registration(mocks.ipcHandle, IPC.updates.check)

    mocks.checkForUpdates.mockResolvedValue({ isUpdateAvailable: false })
    await expect(check()).resolves.toEqual({ status: 'current' })

    mocks.checkForUpdates.mockResolvedValue({
      isUpdateAvailable: true,
      updateInfo: { version: '2.0.0' },
    })
    await expect(check()).resolves.toEqual({ status: 'available', version: '2.0.0' })

    mocks.checkForUpdates.mockRejectedValue(new Error('offline'))
    await expect(check()).resolves.toEqual({ status: 'error' })
  })

  it('forwards updater events and installs a downloaded version once', async () => {
    const { send } = await start(true)
    const downloaded = registration(mocks.updaterOn, 'update-downloaded')
    const available = registration(mocks.updaterOn, 'update-available')
    const error = registration(mocks.updaterOn, 'error')
    const install = registration(mocks.ipcOn, IPC.updates.install)

    available({ version: '1.5.0' })
    downloaded({ version: '2.0.0' })
    expect(send.mock.calls).toEqual([
      [IPC.updates.available, '1.5.0'],
      [IPC.updates.downloaded, '2.0.0'],
    ])
    expect(registration(mocks.ipcHandle, IPC.updates.info)()).toMatchObject({
      downloadedVersion: '2.0.0',
    })

    install()
    install()
    expect(mocks.quitAndInstall).toHaveBeenCalledOnce()
    expect(mocks.quitAndInstall).toHaveBeenCalledWith(true, true)

    error()
    expect(send).toHaveBeenLastCalledWith(IPC.updates.installFailed)
  })

  it('reports background updater failures', async () => {
    const { send } = await start(true)

    registration(mocks.updaterOn, 'error')()

    expect(send).toHaveBeenCalledWith(IPC.updates.failed)
  })
})
