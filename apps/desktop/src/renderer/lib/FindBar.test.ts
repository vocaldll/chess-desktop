import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { tick } from 'svelte'
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { ShortcutCommand } from '$shared/shortcuts'
import { browser } from './browser.svelte'
import FindBar from './FindBar.svelte'
import type { FoundInPageEvent, SiteWebviewElement } from './webview-element'

type FakeWebview = SiteWebviewElement & {
  findInPage: Mock<SiteWebviewElement['findInPage']>
  stopFindInPage: Mock<SiteWebviewElement['stopFindInPage']>
}

let shortcutListener: ((command: ShortcutCommand) => void) | undefined
let webview: FakeWebview

function createWebview(): FakeWebview {
  return Object.assign(document.createElement('div'), {
    findInPage: vi.fn<SiteWebviewElement['findInPage']>().mockReturnValue(1),
    stopFindInPage: vi.fn<SiteWebviewElement['stopFindInPage']>()
  }) as unknown as FakeWebview
}

function report(matches: number, activeMatchOrdinal: number): void {
  const event = Object.assign(new Event('found-in-page'), {
    result: { requestId: 1, matches, activeMatchOrdinal, finalUpdate: true }
  }) satisfies FoundInPageEvent

  webview.dispatchEvent(event)
}

async function openFindBar(): Promise<HTMLElement> {
  shortcutListener?.('find')
  await tick()
  return screen.getByRole('textbox', { name: 'Find on page' })
}

describe('FindBar', () => {
  beforeEach(() => {
    shortcutListener = undefined
    webview = createWebview()
    browser.attach(webview)

    window.api = {
      shortcuts: {
        onCommand: vi.fn((listener) => {
          shortcutListener = listener
          return vi.fn()
        })
      }
    } as unknown as typeof window.api
  })

  it('stays hidden until the find command opens and focuses it', async () => {
    render(FindBar)

    expect(screen.queryByRole('textbox', { name: 'Find on page' })).not.toBeInTheDocument()

    const field = await openFindBar()

    expect(field).toHaveFocus()
  })

  it('restarts the search on every keystroke and reports the match count', async () => {
    const user = userEvent.setup()
    render(FindBar)
    const field = await openFindBar()

    await user.type(field, 'knight')
    report(12, 1)
    await tick()

    expect(webview.findInPage).toHaveBeenCalledTimes('knight'.length)
    expect(webview.findInPage).toHaveBeenLastCalledWith('knight', { findNext: true })
    expect(screen.getByRole('status')).toHaveTextContent('1/12')
  })

  it('moves between matches with Enter and Shift+Enter', async () => {
    const user = userEvent.setup()
    render(FindBar)
    const field = await openFindBar()

    await user.type(field, 'rook')
    await user.keyboard('{Enter}')

    expect(webview.findInPage).toHaveBeenLastCalledWith('rook', { findNext: false, forward: true })

    await user.keyboard('{Shift>}{Enter}{/Shift}')

    expect(webview.findInPage).toHaveBeenLastCalledWith('rook', { findNext: false, forward: false })
  })

  it('reports an empty search without leaving stale results', async () => {
    const user = userEvent.setup()
    render(FindBar)
    const field = await openFindBar()

    await user.type(field, 'pawn')
    report(0, 0)
    await tick()

    expect(screen.getByRole('status')).toHaveTextContent('No results')
    expect(screen.getByRole('button', { name: 'Next match' })).toBeDisabled()

    webview.findInPage.mockClear()
    await user.clear(field)

    expect(webview.findInPage).not.toHaveBeenCalled()
    expect(webview.stopFindInPage).toHaveBeenCalledWith('clearSelection')
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('closes on Escape and clears the highlighted match', async () => {
    const user = userEvent.setup()
    render(FindBar)
    const field = await openFindBar()

    await user.type(field, 'queen')
    await user.keyboard('{Escape}')

    expect(webview.stopFindInPage).toHaveBeenCalledWith('clearSelection')
    expect(screen.queryByRole('textbox', { name: 'Find on page' })).not.toBeInTheDocument()
  })

  it('closes when the page navigates away from the results', async () => {
    const user = userEvent.setup()
    render(FindBar)
    const field = await openFindBar()

    await user.type(field, 'bishop')
    webview.dispatchEvent(new Event('did-navigate'))
    await tick()

    expect(screen.queryByRole('textbox', { name: 'Find on page' })).not.toBeInTheDocument()
  })
})
