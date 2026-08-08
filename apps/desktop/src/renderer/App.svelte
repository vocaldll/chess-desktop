<script lang="ts">
  import { onMount } from 'svelte'
  import { DEFAULT_ZOOM, stepZoom } from '$shared/zoom'
  import Notice from './lib/Notice.svelte'
  import OnboardingTour from './lib/OnboardingTour.svelte'
  import SettingsModal from './lib/SettingsModal.svelte'
  import SiteWebview from './lib/SiteWebview.svelte'
  import Titlebar from './lib/Titlebar.svelte'
  import { browser } from './lib/browser.svelte'
  import { fullscreen } from './lib/fullscreen.svelte'
  import { notices } from './lib/notices.svelte'
  import { onboarding } from './lib/onboarding.svelte'
  import { settings } from './lib/settings.svelte'

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
          keys: ['Esc', 'F11'],
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
      } else if (command === 'zoom-in') {
        changeZoom(1)
      } else if (command === 'zoom-out') {
        changeZoom(-1)
      } else if (command === 'zoom-reset') {
        resetZoom()
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

  function resetZoom(): void {
    const site = settings.current.activeSite

    if (settings.current.zoom[site] !== DEFAULT_ZOOM) {
      settings.setZoom(site, DEFAULT_ZOOM)
    }
  }

  function toggleMute(): void {
    const muted = !settings.current.soundMuted
    settings.set('soundMuted', muted)

    notices.show({
      source: 'mute',
      icon: muted ? 'sound-off' : 'sound-on',
      title: muted ? 'Sound off' : 'Sound on',
      keys: ['Ctrl+M'],
      action: muted ? 'unmute' : 'mute'
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
</script>

<Titlebar onOpenSettings={() => (settingsOpen = true)} />

{#if resolved && !onboarding.pickingSite}
  <SiteWebview />
{/if}

<SettingsModal open={settingsOpen} onClose={() => (settingsOpen = false)} />
<OnboardingTour />
<Notice />
