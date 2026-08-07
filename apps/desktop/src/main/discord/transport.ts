import { createConnection, type Socket } from 'node:net'
import { join } from 'node:path'

const OP_HANDSHAKE = 0
const OP_FRAME = 1
const OP_CLOSE = 2
const OP_PING = 3
const OP_PONG = 4

const HEADER_BYTES = 8
const SOCKET_COUNT = 10
const LINUX_DIRECTORIES = ['', 'snap.discord', 'app/com.discordapp.Discord']

export interface DiscordTransport {
  send(payload: unknown): void
  close(): void
}

export interface TransportHandlers {
  onReady: () => void
  onClose: () => void
}

function socketPaths(): string[] {
  if (process.platform === 'win32') {
    return Array.from({ length: SOCKET_COUNT }, (_, index) => `\\\\?\\pipe\\discord-ipc-${index}`)
  }

  const base =
    process.env.XDG_RUNTIME_DIR ??
    process.env.TMPDIR ??
    process.env.TMP ??
    process.env.TEMP ??
    '/tmp'

  const paths: string[] = []

  for (let index = 0; index < SOCKET_COUNT; index += 1) {
    for (const directory of LINUX_DIRECTORIES) {
      paths.push(join(base, directory, `discord-ipc-${index}`))
    }
  }

  return paths
}

export function connect(clientId: string, handlers: TransportHandlers): DiscordTransport {
  const paths = socketPaths()

  let socket: Socket | null = null
  let buffer = Buffer.alloc(0)
  let ready = false
  let closed = false

  function detach(): Socket | null {
    const active = socket
    socket = null

    if (active) {
      active.removeAllListeners()
      active.on('error', () => null)
    }

    return active
  }

  function fail(): void {
    if (closed) {
      return
    }

    closed = true
    detach()?.destroy()
    handlers.onClose()
  }

  function writeFrame(op: number, body: string): void {
    const payload = Buffer.from(body, 'utf8')
    const frame = Buffer.allocUnsafe(HEADER_BYTES + payload.length)

    frame.writeUInt32LE(op, 0)
    frame.writeUInt32LE(payload.length, 4)
    payload.copy(frame, HEADER_BYTES)

    socket?.write(frame)
  }

  function handleFrame(op: number, body: string): void {
    if (op === OP_PING) {
      writeFrame(OP_PONG, body)
      return
    }

    if (op === OP_CLOSE) {
      fail()
      return
    }

    if (op !== OP_FRAME || ready) {
      return
    }

    try {
      if ((JSON.parse(body) as { evt?: unknown }).evt === 'READY') {
        ready = true
        handlers.onReady()
      }
    } catch {
      return
    }
  }

  function drain(): void {
    while (buffer.length >= HEADER_BYTES) {
      const length = buffer.readUInt32LE(4)

      if (buffer.length < HEADER_BYTES + length) {
        return
      }

      const op = buffer.readUInt32LE(0)
      const body = buffer.subarray(HEADER_BYTES, HEADER_BYTES + length).toString('utf8')
      buffer = buffer.subarray(HEADER_BYTES + length)

      handleFrame(op, body)
    }
  }

  function attempt(index: number): void {
    const path = paths[index]

    if (closed) {
      return
    }

    if (!path) {
      closed = true
      handlers.onClose()
      return
    }

    const candidate = createConnection(path)
    socket = candidate

    candidate.on('connect', () => {
      writeFrame(OP_HANDSHAKE, JSON.stringify({ v: 1, client_id: clientId }))
    })

    candidate.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk])
      drain()
    })

    candidate.on('error', () => {
      detach()?.destroy()

      if (ready) {
        fail()
      } else {
        attempt(index + 1)
      }
    })

    candidate.on('close', () => {
      fail()
    })
  }

  attempt(0)

  return {
    send(payload: unknown): void {
      if (ready && !closed) {
        writeFrame(OP_FRAME, JSON.stringify(payload))
      }
    },
    close(): void {
      if (closed) {
        return
      }

      closed = true
      detach()?.end()
    }
  }
}
