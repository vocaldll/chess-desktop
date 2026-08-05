<script lang="ts">
  import { onMount } from 'svelte'
  import ChessWebview from './lib/ChessWebview.svelte'
  import SettingsModal from './lib/SettingsModal.svelte'
  import Titlebar from './lib/Titlebar.svelte'
  import { settings } from './lib/settings.svelte'

  let settingsOpen = $state(false)

  onMount(() => {
    settings.load()
  })
</script>

<Titlebar onOpenSettings={() => (settingsOpen = true)} />
<ChessWebview />
<SettingsModal open={settingsOpen} onClose={() => (settingsOpen = false)} />
