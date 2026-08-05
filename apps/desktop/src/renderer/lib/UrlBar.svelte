<script lang="ts">
  import Check from '@lucide/svelte/icons/check'
  import Copy from '@lucide/svelte/icons/copy'
  import { SITES, normalizeSiteInput } from '$shared/sites'
  import SiteSwitcher from './SiteSwitcher.svelte'
  import { browser } from './browser.svelte'
  import { settings } from './settings.svelte'

  const COPIED_FEEDBACK = 1400

  let field = $state<HTMLInputElement | null>(null)
  let draft = $state('')
  let editing = $state(false)
  let rejected = $state(false)
  let copied = $state(false)

  let copiedTimer: ReturnType<typeof setTimeout> | undefined

  const site = $derived(SITES[settings.current.activeSite])

  $effect(() => {
    if (!editing) {
      draft = browser.url
    }
  })

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

<div class="urlbar" class:editing class:rejected>
  <SiteSwitcher />

  <div class="divider"></div>

  <input
    bind:this={field}
    bind:value={draft}
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

  <button
    class="copy"
    title={copied ? 'Copied' : 'Copy address'}
    aria-label={copied ? 'Copied' : 'Copy address'}
    onclick={copyUrl}
  >
    {#if copied}
      <Check size={13} strokeWidth={2} />
    {:else}
      <Copy size={13} strokeWidth={1.8} />
    {/if}
  </button>
</div>

<style>
  .urlbar {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    max-width: 520px;
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
</style>
