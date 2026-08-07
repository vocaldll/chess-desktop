<script lang="ts">
  import { onMount } from 'svelte'
  import Notice from './lib/Notice.svelte'
  import OnboardingTour from './lib/OnboardingTour.svelte'
  import SettingsModal from './lib/SettingsModal.svelte'
  import SiteWebview from './lib/SiteWebview.svelte'
  import Titlebar from './lib/Titlebar.svelte'
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
      }
    })
  )

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
    settings.load().then(() => {
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
