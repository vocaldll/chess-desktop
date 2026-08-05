<script lang="ts">
  import { CHESS_PARTITION, CHESS_START_URL } from '$shared/chess'
  import { browser } from './browser.svelte'
  import type { ChessWebviewElement } from './webview-element'

  let element = $state<HTMLElement | null>(null)

  $effect(() => {
    if (!element) {
      return
    }

    const webview = element as unknown as ChessWebviewElement
    browser.attach(webview)

    const sync = () => browser.syncHistory()
    const events = ['dom-ready', 'did-navigate', 'did-navigate-in-page']
    for (const event of events) {
      webview.addEventListener(event, sync)
    }

    return () => {
      for (const event of events) {
        webview.removeEventListener(event, sync)
      }
      browser.detach()
    }
  })

  $effect(() => {
    const unsubscribers = [
      window.api.webview.onLoadStart(() => {
        browser.isLoading = true
      }),
      window.api.webview.onLoadStop(() => {
        browser.isLoading = false
        browser.syncHistory()
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
  <webview
    bind:this={element}
    class="frame"
    src={CHESS_START_URL}
    partition={CHESS_PARTITION}
    allowpopups
  ></webview>

  {#if browser.error}
    <div class="error">
      <div class="card">
        <h2>Can't reach Chess.com</h2>
        <p>{browser.error.errorDescription}</p>
        <button onclick={() => browser.reload()}>Try again</button>
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

  .frame {
    display: flex;
    width: 100%;
    height: 100%;
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
