<script lang="ts">
  import {
    chesscomGameKey,
    isReviewPgn,
    REVIEW_ON_LICHESS_CHANNEL,
    REVIEW_ON_LICHESS_CONTINUE_CHANNEL,
    REVIEW_ON_LICHESS_FAILED_CHANNEL,
    REVIEW_ON_LICHESS_NAVIGATE_CHANNEL
  } from '$shared/lichess-review'
  import { isSiteURL, SITES, type SiteId } from '$shared/sites'
  import { activeGame } from './active-game.svelte'
  import { browser } from './browser.svelte'
  import type { GuestIpcMessageEvent, SiteWebviewElement } from './webview-element'

  let { siteId, active }: { siteId: SiteId; active: boolean } = $props()
  let element = $state<HTMLElement | null>(null)

  const site = $derived(SITES[siteId])
  const resumeUrl = $derived(browser.rememberedUrl(siteId))

  $effect(() => {
    if (!element || !active) {
      return
    }

    const webview = element as unknown as SiteWebviewElement
    let pendingReviewGame = ''
    browser.enterSite(siteId)
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
          await activeGame.switchTo('lichess')
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
      browser.detach(webview)
    }
  })
</script>

<webview
  bind:this={element}
  class="frame"
  class:active
  src={resumeUrl}
  partition={site.partition}
  allowpopups
></webview>

<style>
  .frame {
    position: absolute;
    inset: 0;
    visibility: hidden;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .frame.active {
    visibility: visible;
    pointer-events: auto;
  }
</style>
