import { readFileSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
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

const WRITE_DELAY = 500

let cached: PersistedState | null = null
let dirty = false
let writeTimer: NodeJS.Timeout | null = null
let writeQueue = Promise.resolve()

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

async function write(state: string): Promise<void> {
  const target = statePath()
  const temp = `${target}.tmp`

  await mkdir(dirname(target), { recursive: true })
  await writeFile(temp, state, 'utf8')
  await rename(temp, target)
}

function scheduleWrite(): void {
  dirty = true

  if (writeTimer) {
    clearTimeout(writeTimer)
  }

  writeTimer = setTimeout(() => {
    writeTimer = null
    void flushState()
  }, WRITE_DELAY)
  writeTimer.unref()
}

export async function flushState(): Promise<void> {
  if (writeTimer) {
    clearTimeout(writeTimer)
    writeTimer = null
  }

  do {
    if (dirty) {
      dirty = false
      const serialized = JSON.stringify(read(), null, 2)

      writeQueue = writeQueue
        .then(() => write(serialized))
        .catch((error) => console.error('Failed to persist state:', error))
    }

    await writeQueue
  } while (dirty)
}

export function getSettings(): Settings {
  return { ...read().settings }
}

export function setSetting<K extends SettingKey>(key: K, value: Settings[K]): Settings {
  const state = read()
  state.settings[key] = value
  scheduleWrite()
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
  scheduleWrite()
}

export function getWindowBounds(): WindowBounds {
  return { ...read().window }
}

export function setWindowBounds(bounds: WindowBounds): void {
  const state = read()
  state.window = bounds
  scheduleWrite()
}
