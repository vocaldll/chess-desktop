<script lang="ts">
  import Check from '@lucide/svelte/icons/check'
  import Copy from '@lucide/svelte/icons/copy'
  import ZoomIn from '@lucide/svelte/icons/zoom-in'
  import ZoomOut from '@lucide/svelte/icons/zoom-out'
  import { SITES, normalizeSiteInput } from '$shared/sites'
  import { DEFAULT_ZOOM } from '$shared/zoom'
  import SiteSwitcher from './SiteSwitcher.svelte'
  import { browser } from './browser.svelte'
  import { anchor } from './onboarding.svelte'
  import { settings } from './settings.svelte'

  const COPIED_FEEDBACK = 1400

  interface Props {
    editing?: boolean
  }

  let { editing = $bindable(false) }: Props = $props()

  let root = $state<HTMLElement | null>(null)
  let field = $state<HTMLInputElement | null>(null)
  let draft = $state('')
  let rejected = $state(false)
  let copied = $state(false)

  let copiedTimer: ReturnType<typeof setTimeout> | undefined

  const site = $derived(SITES[settings.current.activeSite])
  const zoom = $derived(settings.current.zoom[settings.current.activeSite])

  $effect(() => {
    if (!editing) {
      draft = browser.url
    }
  })

  $effect(() => {
    if (!editing) {
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      if (root && !root.contains(event.target as Node)) {
        field?.blur()
      }
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  })

  $effect(() =>
    window.api.shortcuts.onCommand((command) => {
      if (command === 'focus-address') {
        field?.focus()
        field?.select()
      }
    })
  )

  $effect(() => {
    return () => clearTimeout(copiedTimer)
  })

  function onFocus(): void {
    editing = true
    field?.select()
  }

  function onBlur(): void {
    editing = false
    rejected = false
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const target = normalizeSiteInput(site.id, draft)

      if (!target) {
        rejected = true
        return
      }

      browser.navigate(target)
      field?.blur()
    } else if (event.key === 'Escape') {
      draft = browser.url
      rejected = false
      field?.blur()
    }
  }

  function resetZoom(): void {
    settings.setZoom(settings.current.activeSite, DEFAULT_ZOOM)
  }

  async function copyUrl(): Promise<void> {
    if (!browser.url) {
      return
    }

    await navigator.clipboard.writeText(browser.url)
    copied = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied = false
    }, COPIED_FEEDBACK)
  }
</script>

<div class="urlbar" class:editing class:rejected bind:this={root}>
  <SiteSwitcher />

  <div class="divider"></div>

  <input
    bind:this={field}
    bind:value={draft}
    use:anchor={'address'}
    type="text"
    aria-label="Address"
    aria-invalid={rejected}
    spellcheck="false"
    autocomplete="off"
    autocorrect="off"
    placeholder={`Enter a ${site.name} address`}
    onfocus={onFocus}
    onblur={onBlur}
    oninput={() => (rejected = false)}
    onkeydown={onKeydown}
  />

  {#if zoom !== DEFAULT_ZOOM}
    <button
      class="zoom"
      title={`Zoom is ${zoom}%, click to reset`}
      aria-label={`Zoom is ${zoom} percent, click to reset`}
      onclick={resetZoom}
    >
      {#if zoom > DEFAULT_ZOOM}
        <ZoomIn size={12} strokeWidth={1.8} />
      {:else}
        <ZoomOut size={12} strokeWidth={1.8} />
      {/if}
      {zoom}%
    </button>
  {/if}

  <button
    class="copy"
    class:copied
    title={copied ? 'Copied' : 'Copy address'}
    aria-label={copied ? 'Copied' : 'Copy address'}
    onclick={copyUrl}
  >
    <span class="icon idle" aria-hidden="true">
      <Copy size={13} strokeWidth={1.8} />
    </span>
    <span class="icon done" aria-hidden="true">
      <Check size={13} strokeWidth={2} />
    </span>
  </button>
</div>

<style>
  .urlbar {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    height: 28px;
    padding: 0 var(--cd-space-1);
    background: var(--cd-background);
    border: 1px solid transparent;
    border-radius: 999px;
    transition:
      background var(--cd-transition),
      border-color var(--cd-transition);
    -webkit-app-region: no-drag;
  }

  .urlbar:hover {
    background: var(--cd-surface-raised);
  }

  .urlbar.editing {
    background: var(--cd-surface-raised);
    border-color: var(--cd-border);
  }

  .urlbar.rejected {
    border-color: var(--cd-danger);
  }

  .divider {
    flex: none;
    width: 1px;
    height: 16px;
    margin: 0 var(--cd-space-2) 0 var(--cd-space-1);
    background: var(--cd-border);
  }

  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    background: transparent;
    color: var(--cd-text-muted);
    font-family: inherit;
    font-size: var(--cd-font-size-sm);
    letter-spacing: 0.01em;
    text-overflow: ellipsis;
    outline: none;
  }

  input::placeholder {
    color: var(--cd-text-subtle);
  }

  .urlbar.editing input {
    color: var(--cd-text);
    text-overflow: clip;
  }

  input::selection {
    background: var(--cd-accent);
    color: var(--cd-accent-contrast);
  }

  .zoom {
    display: flex;
    align-items: center;
    gap: 3px;
    flex: none;
    height: 20px;
    margin-right: var(--cd-space-1);
    padding: 0 7px;
    border: 0;
    border-radius: 999px;
    background: var(--cd-surface-hover);
    color: var(--cd-text-muted);
    font-family: inherit;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition:
      background var(--cd-transition),
      color var(--cd-transition);
  }

  .zoom:hover {
    background: var(--cd-border);
    color: var(--cd-text);
  }

  .zoom:focus-visible {
    outline: 2px solid var(--cd-accent);
    outline-offset: -2px;
  }

  .copy {
    display: grid;
    place-items: center;
    flex: none;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--cd-text-subtle);
    cursor: pointer;
    transition:
      background var(--cd-transition),
      color var(--cd-transition);
  }

  .copy:hover {
    background: var(--cd-surface-hover);
    color: var(--cd-text);
  }

  .copy:focus-visible {
    outline: 2px solid var(--cd-accent);
    outline-offset: -2px;
  }

  .icon {
    display: grid;
    place-items: center;
    grid-area: 1 / 1;
    transition:
      opacity 160ms ease,
      transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .copy .done,
  .copy.copied .idle {
    opacity: 0;
    transform: scale(0.6);
  }

  .copy .idle,
  .copy.copied .done {
    opacity: 1;
    transform: scale(1);
  }

  @media (prefers-reduced-motion: reduce) {
    .icon {
      transition: opacity 100ms ease;
      transform: none;
    }

    .copy .done,
    .copy.copied .idle {
      transform: none;
    }
  }
</style>
