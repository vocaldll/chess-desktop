// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LICHESS_IMPORT_URL } from '../shared/lichess-review'

const electron = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void

  class FakeContents {
    readonly handlers = new Map<string, Handler[]>()
    readonly setWindowOpenHandler = vi.fn()
    readonly executeJavaScript = vi.fn().mockResolvedValue(true)
    url = ''

    on(event: string, handler: Handler): void {
      const handlers = this.handlers.get(event) ?? []
      handlers.push(handler)
      this.handlers.set(event, handlers)
    }

    emit(event: string, ...args: unknown[]): void {
      for (const handler of this.handlers.get(event) ?? []) {
        handler(...args)
      }
    }

    getURL(): string {
      return this.url
    }
  }

  class BrowserWindow {
    static readonly instances: BrowserWindow[] = []
    readonly handlers = new Map<string, Handler[]>()
    readonly webContents = new FakeContents()
    readonly loadURL = vi.fn().mockResolvedValue(undefined)
    destroyed = false

    constructor(readonly options: unknown) {
      BrowserWindow.instances.push(this)
    }

    on(event: string, handler: Handler): void {
      const handlers = this.handlers.get(event) ?? []
      handlers.push(handler)
      this.handlers.set(event, handlers)
    }

    emit(event: string, ...args: unknown[]): void {
      for (const handler of this.handlers.get(event) ?? []) {
        handler(...args)
      }
    }

    isDestroyed(): boolean {
      return this.destroyed
    }

    destroy(): void {
      this.destroyed = true
      this.emit('closed')
    }
  }

  return { BrowserWindow }
})

vi.mock('electron', () => ({ BrowserWindow: electron.BrowserWindow }))

import { importGameOnLichess, submitLichessImport } from './lichess-import'

function latestWindow(): InstanceType<typeof electron.BrowserWindow> {
  const window = electron.BrowserWindow.instances.at(-1)
  if (!window) {
    throw new Error('Expected an import window')
  }
  return window
}

describe('Lichess import form', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('fills the PGN, enables analysis, and submits the form', () => {
    document.body.innerHTML = `
      <form class="import" action="/import">
        <textarea name="pgn"></textarea>
        <input name="analyse" type="checkbox">
      </form>
    `
    const submit = vi
      .spyOn(HTMLFormElement.prototype, 'requestSubmit')
      .mockImplementation(() => undefined)

    expect(submitLichessImport('[Event "Test"]')).toBe(true)
    expect(document.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('[Event "Test"]')
    expect(document.querySelector<HTMLInputElement>('input')?.checked).toBe(true)
    expect(submit).toHaveBeenCalledOnce()

    submit.mockRestore()
  })

  it('returns false when the import form is unavailable', () => {
    expect(submitLichessImport('[Event "Test"]')).toBe(false)
  })

  it('still submits when signed-out analysis is unavailable', () => {
    document.body.innerHTML = `
      <form class="import" action="/import">
        <textarea name="pgn"></textarea>
        <input name="analyse" type="checkbox" disabled>
      </form>
    `
    const submit = vi
      .spyOn(HTMLFormElement.prototype, 'requestSubmit')
      .mockImplementation(() => undefined)

    expect(submitLichessImport('[Event "Test"]')).toBe(true)
    expect(document.querySelector<HTMLInputElement>('input')?.checked).toBe(false)
    expect(submit).toHaveBeenCalledOnce()

    submit.mockRestore()
  })
})

describe('hidden Lichess import window', () => {
  beforeEach(() => {
    electron.BrowserWindow.instances.length = 0
    vi.useRealTimers()
  })

  it('submits the PGN and resolves after navigation to a game', async () => {
    const result = importGameOnLichess('[Event "Test"]')
    const window = latestWindow()
    window.webContents.url = LICHESS_IMPORT_URL

    window.webContents.emit('dom-ready')
    await vi.waitFor(() => expect(window.webContents.executeJavaScript).toHaveBeenCalledOnce())

    const gameUrl = 'https://lichess.org/AbCd1234'
    window.webContents.emit('did-navigate', {}, gameUrl)

    await expect(result).resolves.toBe(gameUrl)
    expect(window.loadURL).toHaveBeenCalledWith(LICHESS_IMPORT_URL)
    expect(window.destroyed).toBe(true)
  })

  it('rejects navigation away from Lichess', async () => {
    const result = importGameOnLichess('[Event "Test"]')
    const rejection = expect(result).rejects.toThrow('left the expected site')
    const event = { preventDefault: vi.fn() }

    latestWindow().webContents.emit('will-navigate', event, 'https://example.com/')

    await rejection
    expect(event.preventDefault).toHaveBeenCalledOnce()
  })

  it('rejects when the import times out', async () => {
    vi.useFakeTimers()
    const result = importGameOnLichess('[Event "Test"]')
    const rejection = expect(result).rejects.toThrow('timed out')

    await vi.advanceTimersByTimeAsync(20_000)

    await rejection
    expect(latestWindow().destroyed).toBe(true)
    vi.useRealTimers()
  })

  it('rejects when the import form cannot be submitted', async () => {
    const result = importGameOnLichess('[Event "Test"]')
    const window = latestWindow()
    window.webContents.url = LICHESS_IMPORT_URL
    window.webContents.executeJavaScript.mockResolvedValue(false)

    window.webContents.emit('dom-ready')

    await expect(result).rejects.toThrow('form was unavailable')
  })
})
