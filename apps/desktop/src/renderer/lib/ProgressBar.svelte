<script lang="ts">
  import { browser } from './browser.svelte'

  const SHOW_DELAY = 180
  const TRICKLE_INTERVAL = 220
  const TRICKLE_RATIO = 0.14
  const CEILING = 90
  const START_AT = 12
  const FADE_OUT = 260

  let visible = $state(false)
  let progress = $state(0)

  let showTimer: ReturnType<typeof setTimeout> | undefined
  let trickleTimer: ReturnType<typeof setInterval> | undefined
  let hideTimer: ReturnType<typeof setTimeout> | undefined

  function trickle(): void {
    clearInterval(trickleTimer)
    trickleTimer = setInterval(() => {
      progress = Math.min(progress + (CEILING - progress) * TRICKLE_RATIO, CEILING)
    }, TRICKLE_INTERVAL)
  }

  function start(): void {
    if (visible) {
      progress = START_AT
      trickle()
      return
    }

    progress = 0
    showTimer = setTimeout(() => {
      visible = true
      progress = START_AT
      trickle()
    }, SHOW_DELAY)
  }

  function finish(): void {
    if (!visible) {
      progress = 0
      return
    }

    progress = 100
    hideTimer = setTimeout(() => {
      visible = false
      progress = 0
    }, FADE_OUT)
  }

  $effect(() => {
    if (browser.isLoading) {
      start()
    } else {
      finish()
    }

    return () => {
      clearTimeout(showTimer)
      clearInterval(trickleTimer)
      clearTimeout(hideTimer)
    }
  })
</script>

<div
  class="progress"
  class:active={visible}
  style="width: {progress}%"
  role="progressbar"
  aria-hidden={!visible}
  aria-label="Page loading"
></div>

<style>
  .progress {
    position: absolute;
    left: 0;
    bottom: -1px;
    height: 2px;
    background: var(--cd-accent);
    opacity: 0;
    pointer-events: none;
    transition: opacity 200ms ease;
  }

  .progress.active {
    opacity: 1;
    transition:
      width 240ms cubic-bezier(0.22, 0.61, 0.36, 1),
      opacity 120ms ease;
  }

  @media (prefers-reduced-motion: reduce) {
    .progress.active {
      transition: opacity 120ms ease;
    }
  }
</style>
