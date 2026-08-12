import type { SiteId } from '$shared/sites'
import { settings } from './settings.svelte'

class ActiveGame {
  playing = $state(false)
  retainedSites = $state<SiteId[]>([])

  connect(): () => void {
    let stateVersion = 0
    const stopPlaying = window.api.activeGame.onPlayingChange((playing) => {
      stateVersion += 1
      this.playing = playing
    })

    void window.api.activeGame.isPlaying().then((playing) => {
      if (stateVersion === 0) {
        this.playing = playing
      }
    })

    return stopPlaying
  }

  async switchTo(siteId: SiteId): Promise<void> {
    const current = settings.current.activeSite
    if (current === siteId) {
      return
    }

    const previousRetained = this.retainedSites
    const retained = new Set(previousRetained)

    if (this.playing) {
      retained.add(current)
    } else {
      retained.delete(current)
    }

    this.retainedSites = [...retained]

    try {
      await settings.set('activeSite', siteId)
    } catch (error) {
      this.retainedSites = previousRetained
      throw error
    }
  }
}

export const activeGame = new ActiveGame()
