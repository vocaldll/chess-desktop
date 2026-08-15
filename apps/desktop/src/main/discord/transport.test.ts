import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const createConnection = vi.hoisted(() => vi.fn())

vi.mock('node:net', () => ({ createConnection }))

import { connect } from './transport'

const OP_HANDSHAKE = 0
const OP_FRAME = 1
const OP_CLOSE = 2
const OP_PING = 3
const OP_PONG = 4

class FakeSocket extends EventEmitter {
  readonly write = vi.fn()
  readonly destroy = vi.fn()
  readonly end = vi.fn()
}

function frame(op: number, value: unknown): Buffer {
  const body = Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))
  const result = Buffer.alloc(8 + body.length)
  result.writeUInt32LE(op, 0)
  result.writeUInt32LE(body.length, 4)
  body.copy(result, 8)
  return result
}

function decode(value: Buffer) {
  return {
    op: value.readUInt32LE(0),
    body: value.subarray(8).toString('utf8'),
  }
}

describe('Discord IPC transport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handshakes, handles fragmented readiness, and sends activity frames', () => {
    const socket = new FakeSocket()
    const onReady = vi.fn()
    const onClose = vi.fn()
    createConnection.mockReturnValue(socket)
    const transport = connect('client-123', { onReady, onClose })

    socket.emit('connect')
    const handshake = decode(socket.write.mock.calls[0][0])
    expect(handshake.op).toBe(OP_HANDSHAKE)
    expect(JSON.parse(handshake.body)).toEqual({ v: 1, client_id: 'client-123' })

    const ready = frame(OP_FRAME, { evt: 'READY' })
    socket.emit('data', ready.subarray(0, 5))
    expect(onReady).not.toHaveBeenCalled()
    socket.emit('data', ready.subarray(5))
    expect(onReady).toHaveBeenCalledOnce()

    transport.send({ cmd: 'SET_ACTIVITY' })
    const activity = decode(socket.write.mock.calls[1][0])
    expect(activity.op).toBe(OP_FRAME)
    expect(JSON.parse(activity.body)).toEqual({ cmd: 'SET_ACTIVITY' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('responds to pings and closes on a remote close frame', () => {
    const socket = new FakeSocket()
    const onClose = vi.fn()
    createConnection.mockReturnValue(socket)
    connect('client-123', { onReady: vi.fn(), onClose })

    socket.emit('data', frame(OP_PING, 'ping-body'))
    expect(decode(socket.write.mock.calls[0][0])).toEqual({ op: OP_PONG, body: 'ping-body' })

    socket.emit('data', frame(OP_CLOSE, {}))
    expect(onClose).toHaveBeenCalledOnce()
    expect(socket.destroy).toHaveBeenCalledOnce()
  })

  it('tries the next socket after a pre-ready connection error', () => {
    const first = new FakeSocket()
    const second = new FakeSocket()
    createConnection.mockReturnValueOnce(first).mockReturnValueOnce(second)
    const onReady = vi.fn()
    connect('client-123', { onReady, onClose: vi.fn() })

    first.emit('error', new Error('missing pipe'))
    expect(first.destroy).toHaveBeenCalledOnce()
    expect(createConnection).toHaveBeenCalledTimes(2)

    second.emit('data', frame(OP_FRAME, { evt: 'READY' }))
    expect(onReady).toHaveBeenCalledOnce()
  })

  it('ends locally without reporting a remote closure', () => {
    const socket = new FakeSocket()
    const onClose = vi.fn()
    createConnection.mockReturnValue(socket)
    const transport = connect('client-123', { onReady: vi.fn(), onClose })

    transport.close()
    transport.close()

    expect(socket.end).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()
  })
})
