<script lang="ts">
  import { onMount } from 'svelte'
  import SettingsModal from './lib/SettingsModal.svelte'
  import SiteWebview from './lib/SiteWebview.svelte'
  import Titlebar from './lib/Titlebar.svelte'
  import { settings } from './lib/settings.svelte'

  let settingsOpen = $state(false)

  onMount(() => {
    settings.load()
  })
</script>

<Titlebar onOpenSettings={() => (settingsOpen = true)} />
<SiteWebview />
<SettingsModal open={settingsOpen} onClose={() => (settingsOpen = false)} />
