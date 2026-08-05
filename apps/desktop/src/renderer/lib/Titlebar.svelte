<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import ArrowRight from '@lucide/svelte/icons/arrow-right'
  import Copy from '@lucide/svelte/icons/copy'
  import Minus from '@lucide/svelte/icons/minus'
  import ProgressBar from './ProgressBar.svelte'
  import RotateCw from '@lucide/svelte/icons/rotate-cw'
  import Settings from '@lucide/svelte/icons/settings'
  import Square from '@lucide/svelte/icons/square'
  import X from '@lucide/svelte/icons/x'
  import UrlBar from './UrlBar.svelte'
  import { browser } from './browser.svelte'
  import { anchor } from './onboarding.svelte'

  interface Props {
    onOpenSettings: () => void
  }

  let { onOpenSettings }: Props = $props()

  const ICON = 16
  const CONTROL_ICON = 12
  const STROKE = 1.8
  const CONTROL_STROKE = 1.6

  let isMaximized = $state(false)
  let addressFocused = $state(false)

  $effect(() => {
    window.api.window.isMaximized().then((value) => {
      isMaximized = value
    })

    return window.api.window.onMaximizeChange((value) => {
      isMaximized = value
    })
  })
</script>

<header class="titlebar" class:interactive={addressFocused}>
  <div class="group">
    <button
      class="btn"
      title="Back"
      aria-label="Back"
      disabled={!browser.canGoBack}
      onclick={() => browser.back()}
    >
      <ArrowLeft size={ICON} strokeWidth={STROKE} />
    </button>
    <button
      class="btn"
      title="Forward"
      aria-label="Forward"
      disabled={!browser.canGoForward}
      onclick={() => browser.forward()}
    >
      <ArrowRight size={ICON} strokeWidth={STROKE} />
    </button>
    <button class="btn" title="Reload" aria-label="Reload" onclick={() => browser.reload()}>
      <RotateCw size={ICON} strokeWidth={STROKE} />
    </button>
  </div>

  <div class="omnibox">
    <UrlBar bind:editing={addressFocused} />
  </div>

  <div class="group">
    <button
      class="btn"
      title="Settings"
      aria-label="Settings"
      onclick={onOpenSettings}
      use:anchor={'settings'}
    >
      <Settings size={ICON} strokeWidth={STROKE} />
    </button>

    <div class="divider"></div>

    <button
      class="btn control"
      title="Minimize"
      aria-label="Minimize"
      onclick={() => window.api.window.minimize()}
      use:anchor={'controlStrip'}
    >
      <Minus size={CONTROL_ICON} strokeWidth={CONTROL_STROKE} />
    </button>
    <button
      class="btn control"
      title={isMaximized ? 'Restore' : 'Maximize'}
      aria-label={isMaximized ? 'Restore' : 'Maximize'}
      onclick={() => window.api.window.toggleMaximize()}
    >
      {#if isMaximized}
        <Copy size={CONTROL_ICON} strokeWidth={CONTROL_STROKE} />
      {:else}
        <Square size={CONTROL_ICON} strokeWidth={CONTROL_STROKE} />
      {/if}
    </button>
    <button
      class="btn control close"
      title="Close"
      aria-label="Close"
      onclick={() => window.api.window.close()}
    >
      <X size={CONTROL_ICON} strokeWidth={CONTROL_STROKE} />
    </button>
  </div>

  <ProgressBar />
</header>

<style>
  .titlebar {
    position: relative;
    display: flex;
    align-items: center;
    flex: 0 0 var(--cd-titlebar-height);
    height: var(--cd-titlebar-height);
    padding: 0 0 0 var(--cd-space-2);
    background: var(--cd-surface);
    border-bottom: 1px solid var(--cd-border);
    -webkit-app-region: drag;
  }

  .titlebar.interactive {
    -webkit-app-region: no-drag;
  }

  .titlebar::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 4px;
    -webkit-app-region: no-drag;
  }

  .group {
    display: flex;
    align-items: center;
    gap: 2px;
    -webkit-app-region: no-drag;
  }

  .omnibox {
    display: flex;
    align-items: center;
    gap: var(--cd-space-2);
    flex: 1;
    justify-content: center;
    min-width: 0;
    padding: 0 var(--cd-space-4);
  }

  .btn {
    display: grid;
    place-items: center;
    width: 34px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: var(--cd-radius-sm);
    background: transparent;
    color: var(--cd-text-muted);
    cursor: pointer;
    transition:
      background var(--cd-transition),
      color var(--cd-transition);
  }

  .btn:hover:not(:disabled) {
    background: var(--cd-surface-hover);
    color: var(--cd-text);
  }

  .btn:disabled {
    color: var(--cd-text-subtle);
    opacity: 0.4;
    cursor: default;
  }

  .btn:focus-visible {
    outline: 2px solid var(--cd-accent);
    outline-offset: -2px;
  }

  .divider {
    width: 1px;
    height: 18px;
    margin: 0 var(--cd-space-2);
    background: var(--cd-border);
  }


  .control {
    width: 44px;
    height: var(--cd-titlebar-height);
    border-radius: 0;
  }

  .close:hover:not(:disabled) {
    background: var(--cd-danger);
    color: #fff;
  }

</style>
