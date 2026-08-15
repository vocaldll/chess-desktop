import { randomUUID } from 'node:crypto'
import { describePresence, type GameRole, type Presence } from '../../shared/presence'
import type { Settings } from '../../shared/settings'
import { SITES, type SiteId } from '../../shared/sites'
import { connect, type DiscordTransport } from './transport'

const CLIENT_ID = '1534631869575073923'
const RECONNECT_DELAY = 15_000
const MIN_UPDATE_INTERVAL = 4_000
const BUTTONS = [{ label: 'Chess Desktop', url: 'https://chessdesktop.app' }]

interface Location {
  siteId: SiteId
  url: string
  role: GameRole
}

let transport: DiscordTransport | null = null
let reconnectTimer: NodeJS.Timeout | null = null
let flushTimer: NodeJS.Timeout | null = null

let enabled = false
let ready = false
let sessionStart: number | null = null
let location: Location | null = null
let lastSent = ''
let lastSentAt = 0

function setActivity(presence: Presence | null): void {
  transport?.send({
    cmd: 'SET_ACTIVITY',
    nonce: randomUUID(),
    args: {
      pid: process.pid,
      activity: presence
        ? {
            details: presence.details,
            state: presence.state,
            assets: { large_image: presence.assetKey, large_text: presence.assetText },
            timestamps: { start: sessionStart ?? Date.now() },
            buttons: BUTTONS,
          }
        : undefined,
    },
  })
}

function push(): void {
  if (!enabled || !ready || !location) {
    return
  }

  const presence = describePresence(location.siteId, location.url, location.role)
  const serialized = JSON.stringify(presence)

  if (serialized === lastSent) {
    return
  }

  const wait = MIN_UPDATE_INTERVAL - (Date.now() - lastSentAt)

  if (wait > 0) {
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null
        push()
      }, wait)
      flushTimer.unref()
    }
    return
  }

  lastSent = serialized
  lastSentAt = Date.now()
  setActivity(presence)
}

function scheduleReconnect(): void {
  if (reconnectTimer) {
    return
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    start()
  }, RECONNECT_DELAY)
  reconnectTimer.unref()
}

function start(): void {
  if (!enabled || transport || reconnectTimer) {
    return
  }

  transport = connect(CLIENT_ID, {
    onReady: () => {
      ready = true
      sessionStart ??= Date.now()
      push()
    },
    onClose: () => {
      transport = null
      ready = false
      lastSent = ''

      if (enabled) {
        scheduleReconnect()
      }
    },
  })
}

function stop(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }

  if (ready) {
    setActivity(null)
  }

  transport?.close()
  transport = null
  ready = false
  sessionStart = null
  lastSent = ''
  lastSentAt = 0
}

export function applyPresenceSettings(settings: Settings): void {
  if (!location || location.siteId !== settings.activeSite) {
    location = {
      siteId: settings.activeSite,
      url: SITES[settings.activeSite].startUrl,
      role: 'unknown',
    }
  }

  if (settings.discordRpcEnabled === enabled) {
    push()
    return
  }

  enabled = settings.discordRpcEnabled

  if (enabled) {
    start()
  } else {
    stop()
  }
}

export function updatePresenceLocation(
  siteId: SiteId,
  url: string,
  role: GameRole = 'unknown',
): void {
  location = { siteId, url, role }
  push()
}

export function shutdownPresence(): void {
  enabled = false
  stop()
}
