import { app, type BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { type AppUpdateCheckResult, type AppUpdateInfo, IPC } from '../shared/ipc-channels'

const CHECK_INTERVAL = 1000 * 60 * 60
let downloadedVersion: string | null = null

function canCheckForUpdates(): boolean {
  return app.isPackaged && (process.platform !== 'linux' || Boolean(process.env.APPIMAGE))
}

function updateInfo(): AppUpdateInfo {
  return {
    version: app.getVersion(),
    canCheck: canCheckForUpdates(),
    downloadedVersion
  }
}

async function checkForUpdates(): Promise<AppUpdateCheckResult> {
  if (!canCheckForUpdates()) {
    return { status: 'unsupported' }
  }

  try {
    const result = await autoUpdater.checkForUpdates()

    if (!result) {
      return { status: 'error' }
    }

    return result.isUpdateAvailable
      ? { status: 'available', version: result.updateInfo.version }
      : { status: 'current' }
  } catch {
    return { status: 'error' }
  }
}

export function startAutoUpdates(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC.updates.info, updateInfo)
  ipcMain.handle(IPC.updates.check, checkForUpdates)

  if (!canCheckForUpdates()) {
    return
  }

  let installing = false

  ipcMain.on(IPC.updates.install, () => {
    if (!downloadedVersion || installing) {
      return
    }

    installing = true
    autoUpdater.quitAndInstall(true, true)
  })

  autoUpdater.on('error', () => {
    if (installing) {
      installing = false
      getWindow()?.webContents.send(IPC.updates.installFailed)
    } else {
      getWindow()?.webContents.send(IPC.updates.failed)
    }
  })

  const check = (): void => {
    void checkForUpdates()
  }

  const timer = setInterval(check, CHECK_INTERVAL)

  autoUpdater.on('update-available', (info) => {
    getWindow()?.webContents.send(IPC.updates.available, info.version)
  })

  autoUpdater.on('update-downloaded', (info) => {
    downloadedVersion = info.version
    clearInterval(timer)
    getWindow()?.webContents.send(IPC.updates.downloaded, info.version)
  })

  app.on('before-quit', () => {
    clearInterval(timer)
  })

  check()
}
