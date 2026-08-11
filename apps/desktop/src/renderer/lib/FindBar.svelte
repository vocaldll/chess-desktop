<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down'
  import ChevronUp from '@lucide/svelte/icons/chevron-up'
  import X from '@lucide/svelte/icons/x'
  import { tick } from 'svelte'
  import { browser } from './browser.svelte'
  import type { FoundInPageEvent } from './webview-element'

  const ICON = 14
  const STROKE = 1.8

  let open = $state(false)
  let query = $state('')
  let matches = $state(0)
  let activeMatch = $state(0)
  let field = $state<HTMLInputElement | null>(null)

  const missing = $derived(query !== '' && matches === 0)
  const status = $derived(query === '' ? '' : missing ? 'No results' : `${activeMatch}/${matches}`)

  $effect(() =>
    window.api.shortcuts.onCommand((command) => {
      if (command === 'find') {
        void show()
      }
    })
  )

  $effect(() => {
    const element = browser.element

    if (!element) {
      return
    }

    const onFound = (event: Event) => {
      const { matches: found, activeMatchOrdinal } = (event as FoundInPageEvent).result
      matches = found
      activeMatch = activeMatchOrdinal
    }

    element.addEventListener('found-in-page', onFound)
    element.addEventListener('did-navigate', close)

    return () => {
      element.removeEventListener('found-in-page', onFound)
      element.removeEventListener('did-navigate', close)
      reset()
    }
  })

  async function show(): Promise<void> {
    open = true
    await tick()
    field?.focus()
    field?.select()
  }

  function reset(): void {
    open = false
    query = ''
    matches = 0
    activeMatch = 0
  }

  function close(): void {
    reset()
    browser.element?.stopFindInPage('clearSelection')
  }

  // Electron maps findInPage's findNext option onto Chromium's new_session flag:
  // true restarts the search, false advances through the current one.
  function search(): void {
    const element = browser.element

    if (!element) {
      return
    }

    if (query === '') {
      matches = 0
      activeMatch = 0
      element.stopFindInPage('clearSelection')
      return
    }

    element.findInPage(query, { findNext: true })
  }

  function step(forward: boolean): void {
    if (query !== '') {
      browser.element?.findInPage(query, { findNext: false, forward })
    }

    field?.focus()
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      step(!event.shiftKey)
    } else if (event.key === 'Escape') {
      close()
    }
  }
</script>

{#if open}
  <div class="findbar">
    <input
      bind:this={field}
      bind:value={query}
      type="text"
      aria-label="Find on page"
      spellcheck="false"
      autocomplete="off"
      placeholder="Find on page"
      oninput={search}
      onkeydown={onKeydown}
    />

    <span class="count" class:missing role="status">{status}</span>

    <div class="divider"></div>

    <button
      class="icon"
      title="Previous match"
      aria-label="Previous match"
      disabled={matches === 0}
      onclick={() => step(false)}
    >
      <ChevronUp size={ICON} strokeWidth={STROKE} />
    </button>
    <button
      class="icon"
      title="Next match"
      aria-label="Next match"
      disabled={matches === 0}
      onclick={() => step(true)}
    >
      <ChevronDown size={ICON} strokeWidth={STROKE} />
    </button>
    <button class="icon" title="Close find" aria-label="Close find" onclick={close}>
      <X size={ICON} strokeWidth={STROKE} />
    </button>
  </div>
{/if}

<style>
  .findbar {
    position: absolute;
    top: var(--cd-space-3);
    right: var(--cd-space-4);
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: var(--cd-space-1);
    padding: var(--cd-space-1) var(--cd-space-2) var(--cd-space-1) var(--cd-space-4);
    border: 1px solid var(--cd-border);
    border-radius: 999px;
    background: var(--cd-surface);
    box-shadow: var(--cd-shadow-popover);
    animation: find-in 160ms ease;
  }

  input {
    width: 180px;
    height: 24px;
    border: 0;
    background: transparent;
    color: var(--cd-text);
    font-family: inherit;
    font-size: var(--cd-font-size-sm);
    outline: none;
  }

  input::placeholder {
    color: var(--cd-text-subtle);
  }

  input::selection {
    background: var(--cd-accent);
    color: var(--cd-accent-contrast);
  }

  .count {
    min-width: 44px;
    color: var(--cd-text-subtle);
    font-size: var(--cd-font-size-sm);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    text-align: right;
  }

  .count.missing {
    color: var(--cd-danger);
  }

  .divider {
    width: 1px;
    height: 16px;
    margin: 0 var(--cd-space-1);
    background: var(--cd-border);
  }

  .icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--cd-text-muted);
    cursor: pointer;
    transition:
      background var(--cd-transition),
      color var(--cd-transition);
  }

  .icon:hover:not(:disabled) {
    background: var(--cd-surface-hover);
    color: var(--cd-text);
  }

  .icon:disabled {
    color: var(--cd-text-subtle);
    opacity: 0.4;
    cursor: default;
  }

  .icon:focus-visible {
    outline: 2px solid var(--cd-accent);
    outline-offset: -2px;
  }

  @keyframes find-in {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .findbar {
      animation: none;
    }
  }
</style>
