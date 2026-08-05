<script lang="ts">
  import { onMount } from 'svelte'
  import OnboardingTour from './lib/OnboardingTour.svelte'
  import SettingsModal from './lib/SettingsModal.svelte'
  import SiteWebview from './lib/SiteWebview.svelte'
  import Titlebar from './lib/Titlebar.svelte'
  import { onboarding } from './lib/onboarding.svelte'
  import { settings } from './lib/settings.svelte'

  let settingsOpen = $state(false)
  let resolved = $state(false)

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
