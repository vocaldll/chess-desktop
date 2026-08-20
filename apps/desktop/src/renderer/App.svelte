<script lang="ts">
  import { onMount } from 'svelte'
  import { resolveShortcutChords, SHORTCUTS, type ShortcutAction } from '$shared/shortcuts'
  import { SITES, type SiteId } from '$shared/sites'
  import { DEFAULT_ZOOM, stepZoom } from '$shared/zoom'
  import { activeGame } from './lib/active-game.svelte'
  import { browser } from './lib/browser.svelte'
  import { fullscreen } from './lib/fullscreen.svelte'
  import Notice from './lib/Notice.svelte'
  import { notices } from './lib/notices.svelte'
  import OnboardingTour from './lib/OnboardingTour.svelte'
  import { onboarding } from './lib/onboarding.svelte'
  import SettingsModal from './lib/SettingsModal.svelte'
  import SiteWebview from './lib/SiteWebview.svelte'
  import { settings } from './lib/settings.svelte'
  import Titlebar from './lib/Titlebar.svelte'

  let settingsOpen = $state(false)
  let resolved = $state(false)

  $effect(() =>
    window.api.window.onFullscreenChange((value) => {
      fullscreen.active = value

      if (value) {
        notices.show({
          source: 'fullscreen',
          icon: 'fullscreen',
          title: "You're in full screen",
          keys: [...shortcutKeys('exit-fullscreen'), ...shortcutKeys('fullscreen')],
          action: 'exit'
        })
      } else {
        notices.clear('fullscreen')
      }
    })
  )

  $effect(() =>
    window.api.shortcuts.onCommand((command) => {
      if (command === 'toggle-mute') {
        toggleMute()
      } else if (command === 'toggle-always-on-top') {
        toggleAlwaysOnTop()
      } else if (command === 'zoom-in') {
        changeZoom(1)
      } else if (command === 'zoom-out') {
        changeZoom(-1)
      } else if (command === 'zoom-reset') {
        resetZoom()
      } else if (command === 'switch-chesscom') {
        void switchSite('chesscom')
      } else if (command === 'switch-lichess') {
        void switchSite('lichess')
      }
    })
  )

  function changeZoom(direction: 1 | -1): void {
    const site = settings.current.activeSite
    const current = settings.current.zoom[site]
    const next = stepZoom(current, direction)

    if (next !== current) {
      settings.setZoom(site, next)
    }
  }

  function shortcutKeys(command: ShortcutAction): string[] {
    const shortcut = SHORTCUTS.find((candidate) => candidate.command === command)
    return shortcut
      ? resolveShortcutChords(shortcut, settings.current.shortcutOverrides).map(
          (chord) => chord.label
        )
      : []
  }

  function resetZoom(): void {
    const site = settings.current.activeSite

    if (settings.current.zoom[site] !== DEFAULT_ZOOM) {
      settings.setZoom(site, DEFAULT_ZOOM)
    }
  }

  async function switchSite(siteId: SiteId): Promise<void> {
    const previousSite = settings.current.activeSite
    if (previousSite === siteId) {
      return
    }

    await activeGame.switchTo(siteId)

    notices.show({
      source: 'site-switch',
      icon: 'site-switch',
      title: `Switched to ${SITES[siteId].name}`,
      keys: shortcutKeys(previousSite === 'chesscom' ? 'switch-chesscom' : 'switch-lichess'),
      action: `go back to ${SITES[previousSite].name}`
    })
  }

  function toggleMute(): void {
    const muted = !settings.current.soundMuted
    settings.set('soundMuted', muted)

    notices.show({
      source: 'mute',
      icon: muted ? 'sound-off' : 'sound-on',
      title: muted ? 'Sound off' : 'Sound on',
      keys: shortcutKeys('toggle-mute'),
      action: muted ? 'unmute' : 'mute'
    })
  }

  function toggleAlwaysOnTop(): void {
    const alwaysOnTop = !settings.current.alwaysOnTop
    settings.set('alwaysOnTop', alwaysOnTop)

    notices.show({
      source: 'always-on-top',
      icon: alwaysOnTop ? 'pin' : 'pin-off',
      title: alwaysOnTop ? 'Always on top enabled' : 'Always on top disabled',
      keys: shortcutKeys('toggle-always-on-top'),
      action: alwaysOnTop ? 'disable' : 'enable'
    })
  }

  onMount(() => {
    Promise.all([settings.load(), browser.load()]).then(() => {
      if (!settings.current.onboardingCompleted) {
        onboarding.start()
      }

      resolved = true
    })
  })

  onMount(() => activeGame.connect())
</script>

<Titlebar onOpenSettings={() => (settingsOpen = true)} />

{#if resolved && !onboarding.pickingSite}
  <SiteWebview />
{/if}

<SettingsModal open={settingsOpen} onClose={() => (settingsOpen = false)} />
<OnboardingTour />
<Notice />
