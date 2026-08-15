<script lang="ts">
  import { SITE_ORDER, SITES } from '$shared/sites'
  import { activeGame } from './active-game.svelte'
  import { browser } from './browser.svelte'
  import FindBar from './FindBar.svelte'
  import SiteFrame from './SiteFrame.svelte'
  import { settings } from './settings.svelte'

  const activeSite = $derived(settings.current.activeSite)
  const site = $derived(SITES[activeSite])
  const mountedSites = $derived(
    SITE_ORDER.filter((siteId) => siteId === activeSite || activeGame.retainedSites.includes(siteId))
  )

  $effect(() => {
    const unsubscribers = [
      window.api.webview.onLoadStart(() => {
        browser.isLoading = true
      }),
      window.api.webview.onLoadStop(() => {
        browser.isLoading = false
        browser.syncHistory(settings.current.activeSite)
      }),
      window.api.webview.onLoadError((error) => {
        browser.isLoading = false
        browser.error = error
      })
    ]

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }
    }
  })
</script>

<div class="content">
  {#each mountedSites as siteId (siteId)}
    <SiteFrame {siteId} active={siteId === activeSite} />
  {/each}

  <FindBar />

  {#if browser.error}
    <div class="error">
      <div class="card">
        <h2>Can't reach {site.name}</h2>
        <p>{browser.error.errorDescription}</p>
        <button type="button" onclick={() => browser.reload()}>Try again</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .content {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  .error {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: var(--cd-background);
  }

  .card {
    max-width: 380px;
    padding: var(--cd-space-6);
    text-align: center;
  }

  .card h2 {
    margin: 0 0 var(--cd-space-2);
    font-size: var(--cd-font-size-lg);
  }

  .card p {
    margin: 0 0 var(--cd-space-5);
    color: var(--cd-text-muted);
    line-height: 1.5;
    word-break: break-word;
  }

  .card button {
    padding: 10px 22px;
    border: 0;
    border-radius: var(--cd-radius);
    background: var(--cd-accent);
    color: var(--cd-accent-contrast);
    font-family: inherit;
    font-size: var(--cd-font-size);
    font-weight: 600;
    cursor: pointer;
    transition: background var(--cd-transition);
  }

  .card button:hover {
    background: var(--cd-accent-hover);
  }
</style>
