import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import { coerceSettings, defaultSettings, type SettingKey, type Settings } from '../shared/settings'
import {
  coerceLastSiteUrls,
  DEFAULT_LAST_SITE_URLS,
  isSiteURL,
  type LastSiteUrls,
  type SiteId
} from '../shared/sites'

export interface WindowBounds {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized: boolean
}

interface PersistedState {
  settings: Settings
  window: WindowBounds
  lastSiteUrls: LastSiteUrls
}

const defaultWindowBounds: WindowBounds = {
  width: 1280,
  height: 820,
  isMaximized: false
}

let cached: PersistedState | null = null

function statePath(): string {
  return join(app.getPath('userData'), 'state.json')
}

function coerceWindowBounds(raw: unknown): WindowBounds {
  if (typeof raw !== 'object' || raw === null) {
    return { ...defaultWindowBounds }
  }

  const source = raw as Record<string, unknown>
  const numberOr = (value: unknown, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback

  return {
    width: Math.max(800, numberOr(source.width, defaultWindowBounds.width)),
    height: Math.max(600, numberOr(source.height, defaultWindowBounds.height)),
    x: typeof source.x === 'number' && Number.isFinite(source.x) ? source.x : undefined,
    y: typeof source.y === 'number' && Number.isFinite(source.y) ? source.y : undefined,
    isMaximized: source.isMaximized === true
  }
}

function read(): PersistedState {
  if (cached) {
    return cached
  }

  try {
    const raw = JSON.parse(readFileSync(statePath(), 'utf8')) as Record<string, unknown>
    cached = {
      settings: coerceSettings(raw.settings),
      window: coerceWindowBounds(raw.window),
      lastSiteUrls: coerceLastSiteUrls(raw.lastSiteUrls)
    }
  } catch {
    cached = {
      settings: { ...defaultSettings },
      window: { ...defaultWindowBounds },
      lastSiteUrls: { ...DEFAULT_LAST_SITE_URLS }
    }
  }

  return cached
}

function write(state: PersistedState): void {
  const target = statePath()
  const temp = `${target}.tmp`

  try {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(temp, JSON.stringify(state, null, 2), 'utf8')
    renameSync(temp, target)
  } catch (error) {
    console.error('Failed to persist state:', error)
  }
}

export function getSettings(): Settings {
  return { ...read().settings }
}

export function setSetting<K extends SettingKey>(key: K, value: Settings[K]): Settings {
  const state = read()
  state.settings[key] = value
  write(state)
  return { ...state.settings }
}

export function getLastSiteUrls(): LastSiteUrls {
  return { ...read().lastSiteUrls }
}

export function setLastSiteUrl(siteId: SiteId, url: string): void {
  if (!isSiteURL(siteId, url)) {
    return
  }

  const state = read()
  if (state.lastSiteUrls[siteId] === url) {
    return
  }

  state.lastSiteUrls[siteId] = url
  write(state)
}

export function getWindowBounds(): WindowBounds {
  return { ...read().window }
}

export function setWindowBounds(bounds: WindowBounds): void {
  const state = read()
  state.window = bounds
  write(state)
}
