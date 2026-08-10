<script lang="ts">
  import { isSiteURL, SITES } from '$shared/sites'
  import {
    chesscomGameKey,
    isReviewPgn,
    REVIEW_ON_LICHESS_CHANNEL,
    REVIEW_ON_LICHESS_CONTINUE_CHANNEL,
    REVIEW_ON_LICHESS_FAILED_CHANNEL,
    REVIEW_ON_LICHESS_NAVIGATE_CHANNEL
  } from '$shared/lichess-review'
  import { browser } from './browser.svelte'
  import { settings } from './settings.svelte'
  import type { GuestIpcMessageEvent, SiteWebviewElement } from './webview-element'

  let element = $state<HTMLElement | null>(null)
  const site = $derived(SITES[settings.current.activeSite])

  $effect(() => {
    browser.enterSite(site.id)
  })

  $effect(() => {
    if (!element) {
      return
    }

    const siteId = site.id
    const webview = element as unknown as SiteWebviewElement
    let pendingReviewGame = ''
    browser.attach(webview)

    const sync = () => browser.syncHistory(siteId)
    const onDomReady = () => {
      sync()

      const currentGame = chesscomGameKey(webview.getURL())
      if (!pendingReviewGame || !currentGame) {
        return
      }

      if (currentGame === pendingReviewGame) {
        pendingReviewGame = ''
        webview.send(REVIEW_ON_LICHESS_CONTINUE_CHANNEL)
      } else {
        pendingReviewGame = ''
      }
    }
    const onGuestMessage = (event: Event) => {
      const message = event as GuestIpcMessageEvent
      const payload = message.args[0]

      if (siteId !== 'chesscom') {
        return
      }

      if (message.channel === REVIEW_ON_LICHESS_NAVIGATE_CHANNEL) {
        const game = typeof payload === 'string' ? chesscomGameKey(payload) : null
        if (!game || typeof payload !== 'string' || !isSiteURL('chesscom', payload)) {
          return
        }

        pendingReviewGame = game
        void webview.loadURL(payload).catch(() => {
          pendingReviewGame = ''
          if (webview.isConnected) {
            webview.send(REVIEW_ON_LICHESS_FAILED_CHANNEL)
          }
        })
        return
      }

      if (message.channel !== REVIEW_ON_LICHESS_CHANNEL || !isReviewPgn(payload)) {
        return
      }

      void (async () => {
        try {
          const url = await window.api.reviewOnLichess.start(payload)
          browser.setRememberedUrl('lichess', url)
          await settings.set('activeSite', 'lichess')
        } catch {
          if (webview.isConnected) {
            webview.send(REVIEW_ON_LICHESS_FAILED_CHANNEL)
          }
        }
      })()
    }

    const events = ['dom-ready', 'did-navigate', 'did-navigate-in-page']
    webview.addEventListener('dom-ready', onDomReady)
    for (const event of events.slice(1)) {
      webview.addEventListener(event, sync)
    }
    webview.addEventListener('ipc-message', onGuestMessage)

    return () => {
      webview.removeEventListener('dom-ready', onDomReady)
      for (const event of events.slice(1)) {
        webview.removeEventListener(event, sync)
      }
      webview.removeEventListener('ipc-message', onGuestMessage)
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
  {#key site.id}
    {@const resumeUrl = browser.rememberedUrl(site.id)}
    <webview
      bind:this={element}
      class="frame"
      src={resumeUrl}
      partition={site.partition}
      allowpopups
    ></webview>
  {/key}

  {#if browser.error}
    <div class="error">
      <div class="card">
        <h2>Can't reach {site.name}</h2>
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
