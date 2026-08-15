<script lang="ts">
  import Maximize from '@lucide/svelte/icons/maximize'
  import Pin from '@lucide/svelte/icons/pin'
  import PinOff from '@lucide/svelte/icons/pin-off'
  import Volume2 from '@lucide/svelte/icons/volume-2'
  import VolumeOff from '@lucide/svelte/icons/volume-off'
  import { fullscreen } from './fullscreen.svelte'
  import Key from './Key.svelte'
  import { type Notice, notices } from './notices.svelte'

  const DISMISS_AFTER = 4000
  const ICON = 15
  const STROKE = 1.8

  const icons = {
    fullscreen: Maximize,
    pin: Pin,
    'pin-off': PinOff,
    'sound-on': Volume2,
    'sound-off': VolumeOff
  }

  let visible = $state(false)
  let shown = $state<Notice | null>(null)

  $effect(() => {
    const current = notices.current

    if (!current) {
      visible = false
      return
    }

    shown = current
    visible = true

    const timer = setTimeout(() => {
      visible = false
    }, DISMISS_AFTER)

    return () => clearTimeout(timer)
  })
</script>

{#if shown}
  {@const Icon = icons[shown.icon]}

  <div
    class="notice"
    class:visible
    class:below-titlebar={!fullscreen.active}
    role="status"
    aria-hidden={!visible}
  >
    <span class="lead">
      <Icon size={ICON} strokeWidth={STROKE} />
      <span class="title">{shown.title}</span>
    </span>

    <span class="hint">
      Press
      {#each shown.keys as key, index (key)}
        {#if index > 0}or{/if}
        <Key label={key} />
      {/each}
      to {shown.action}
    </span>
  </div>
{/if}

<style>
  .notice {
    position: fixed;
    top: var(--cd-space-5);
    left: 50%;
    z-index: 1500;
    display: flex;
    align-items: center;
    gap: var(--cd-space-3);
    padding: 10px var(--cd-space-4);
    border: 1px solid var(--cd-border);
    border-radius: 999px;
    background: var(--cd-surface);
    box-shadow: var(--cd-shadow-modal);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transform: translate(-50%, -10px);
    transition:
      opacity 200ms ease,
      transform 200ms ease;
  }

  .notice.below-titlebar {
    top: calc(var(--cd-titlebar-height) + var(--cd-space-4));
  }

  .notice.visible {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  .lead {
    display: flex;
    align-items: center;
    gap: var(--cd-space-2);
    color: var(--cd-text);
  }

  .title {
    font-size: var(--cd-font-size-sm);
    font-weight: 600;
  }

  .hint {
    display: flex;
    align-items: center;
    gap: var(--cd-space-1);
    font-size: var(--cd-font-size-sm);
    color: var(--cd-text-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .notice,
    .notice.visible {
      transform: translate(-50%, 0);
      transition: opacity 200ms ease;
    }
  }
</style>
