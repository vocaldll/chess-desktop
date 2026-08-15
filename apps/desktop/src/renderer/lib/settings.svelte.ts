import { defaultSettings, type SettingKey, type Settings } from '$shared/settings'
import type { SiteId } from '$shared/sites'
import {
  initializeRendererErrorReporting,
  setRendererErrorReportingEnabled,
} from './error-reporting'

class SettingsStore {
  current = $state<Settings>({ ...defaultSettings })
  loaded = $state(false)

  async load(): Promise<void> {
    this.current = await window.api.settings.getAll()
    initializeRendererErrorReporting(this.current.anonymousErrorReporting)
    this.loaded = true
  }

  async set<K extends SettingKey>(key: K, value: Settings[K]): Promise<void> {
    this.current = await window.api.settings.set(key, value)
    if (key === 'anonymousErrorReporting') {
      setRendererErrorReportingEnabled(this.current.anonymousErrorReporting)
    }
  }

  async setZoom(site: SiteId, percent: number): Promise<void> {
    await this.set('zoom', { ...this.current.zoom, [site]: percent })
  }
}

export const settings = new SettingsStore()
