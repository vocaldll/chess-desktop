import { defaultSettings, type SettingKey, type Settings } from '$shared/settings'

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
}

export const settings = new SettingsStore()
