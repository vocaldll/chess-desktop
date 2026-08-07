import { defaultSettings, type SettingKey, type Settings } from '$shared/settings'
import type { SiteId } from '$shared/sites'

class SettingsStore {
  current = $state<Settings>({ ...defaultSettings })
  loaded = $state(false)

  async load(): Promise<void> {
    this.current = await window.api.settings.getAll()
    this.loaded = true
  }

  async set<K extends SettingKey>(key: K, value: Settings[K]): Promise<void> {
    this.current = await window.api.settings.set(key, value)
  }

  async setZoom(site: SiteId, percent: number): Promise<void> {
    await this.set('zoom', { ...this.current.zoom, [site]: percent })
  }
}

export const settings = new SettingsStore()
