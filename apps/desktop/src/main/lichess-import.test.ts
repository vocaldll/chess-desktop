// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ BrowserWindow: vi.fn() }))

import { submitLichessImport } from './lichess-import'

describe('hidden Lichess import form', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('fills the PGN and requests computer analysis', () => {
    const pgn = '[Event "Live Chess"]\n[Result "0-1"]\n\n1. e4 e5 0-1'
    document.body.innerHTML = `
      <form class="import" action="/import">
        <textarea name="pgn"></textarea>
        <input name="analyse" type="checkbox">
      </form>
    `
    const form = document.querySelector<HTMLFormElement>('form') as HTMLFormElement
    form.requestSubmit = vi.fn()

    expect(submitLichessImport(pgn)).toBe(true)
    expect(document.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe(pgn)
    expect(document.querySelector<HTMLInputElement>('input')?.checked).toBe(true)
    expect(form.requestSubmit).toHaveBeenCalledOnce()
  })

  it('still imports when signed-out analysis is unavailable', () => {
    const pgn = '[Event "Live Chess"]\n[Result "1-0"]\n\n1. e4 e5 1-0'
    document.body.innerHTML = `
      <form class="import" action="/import">
        <textarea name="pgn"></textarea>
        <input name="analyse" type="checkbox" disabled>
      </form>
    `
    const form = document.querySelector<HTMLFormElement>('form') as HTMLFormElement
    form.requestSubmit = vi.fn()

    expect(submitLichessImport(pgn)).toBe(true)
    expect(document.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe(pgn)
    expect(document.querySelector<HTMLInputElement>('input')?.checked).toBe(false)
    expect(form.requestSubmit).toHaveBeenCalledOnce()
  })
})
