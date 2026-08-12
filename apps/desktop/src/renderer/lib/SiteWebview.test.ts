import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { beforeEach, describe, expect, it } from 'vitest'
import { defaultSettings } from '$shared/settings'
import { activeGame } from './active-game.svelte'
import SiteWebview from './SiteWebview.svelte'
import { settings } from './settings.svelte'

describe('SiteWebview', () => {
  beforeEach(() => {
    settings.current = { ...defaultSettings, zoom: { ...defaultSettings.zoom } }
    activeGame.retainedSites = []
    window.api = {
      shortcuts: {
        onCommand: () => () => undefined
      },
      webview: {
        onLoadStart: () => () => undefined,
        onLoadStop: () => () => undefined,
        onLoadError: () => () => undefined
      }
    } as unknown as typeof window.api
  })

  it('keeps a retained game webview mounted while another site is active', async () => {
    const { container } = render(SiteWebview)
    const chesscom = container.querySelector('webview')

    expect(chesscom).toHaveAttribute('src', 'https://www.chess.com/')

    activeGame.retainedSites = ['chesscom']
    settings.current = { ...settings.current, activeSite: 'lichess' }
    await tick()

    const frames = container.querySelectorAll('webview')
    expect(frames).toHaveLength(2)
    expect(frames[0]).toBe(chesscom)
    expect(frames[0]).not.toHaveClass('active')
    expect(frames[1]).toHaveAttribute('src', 'https://lichess.org/')
    expect(frames[1]).toHaveClass('active')
  })
})
