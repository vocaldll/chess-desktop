import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '$shared/settings'
import { activeGame } from './active-game.svelte'
import { settings } from './settings.svelte'

describe('active game sessions', () => {
  beforeEach(() => {
    settings.current = { ...defaultSettings, zoom: { ...defaultSettings.zoom } }
    activeGame.playing = false
    activeGame.retainedSites = []
    vi.restoreAllMocks()
  })

  it('retains the current site when switching during a game', async () => {
    vi.spyOn(settings, 'set').mockResolvedValue(undefined)
    activeGame.playing = true

    await activeGame.switchTo('lichess')

    expect(activeGame.retainedSites).toEqual(['chesscom'])
    expect(settings.set).toHaveBeenCalledWith('activeSite', 'lichess')
  })

  it('releases a retained site when leaving it outside a game', async () => {
    settings.current.activeSite = 'chesscom'
    activeGame.retainedSites = ['chesscom']
    vi.spyOn(settings, 'set').mockResolvedValue(undefined)

    await activeGame.switchTo('lichess')

    expect(activeGame.retainedSites).toEqual([])
  })

  it('restores retention when changing the setting fails', async () => {
    activeGame.playing = true
    vi.spyOn(settings, 'set').mockRejectedValue(new Error('failed'))

    await expect(activeGame.switchTo('lichess')).rejects.toThrow('failed')
    expect(activeGame.retainedSites).toEqual([])
  })
})
