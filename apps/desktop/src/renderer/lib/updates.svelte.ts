import type { AppUpdateCheckResult, AppUpdateInfo } from '$shared/ipc-channels'

class UpdateStore {
  info = $state<AppUpdateInfo | null>(null)
  infoFailed = $state(false)
  checkResult = $state<AppUpdateCheckResult | null>(null)
  checking = $state(false)
  downloadedVersion = $state<string | null>(null)
  installing = $state(false)

  constructor() {
    window.api.updates.onAvailable((version) => {
      this.checkResult = { status: 'available', version }
    })

    window.api.updates.onFailed(() => {
      this.checking = false
      this.checkResult = { status: 'error' }
    })

    window.api.updates.onDownloaded((version) => {
      this.downloadedVersion = version
      this.checkResult = { status: 'available', version }
    })

    window.api.updates.onInstallFailed(() => {
      this.installing = false
    })

    void this.loadInfo()
  }

  async loadInfo(): Promise<void> {
    this.infoFailed = false

    try {
      const info = await window.api.updates.getInfo()
      this.info = info
      if (info.downloadedVersion) {
        this.downloadedVersion = info.downloadedVersion
      }
    } catch {
      this.infoFailed = true
    }
  }

  async check(): Promise<void> {
    if (this.checking || !this.info?.canCheck || this.downloadedVersion) {
      return
    }

    this.checking = true
    this.checkResult = null

    try {
      this.checkResult = await window.api.updates.check()
    } catch {
      this.checkResult = { status: 'error' }
    } finally {
      this.checking = false
    }
  }

  install(): void {
    if (!this.downloadedVersion || this.installing) {
      return
    }

    this.installing = true
    window.api.updates.install()
  }
}

export const updates = new UpdateStore()
