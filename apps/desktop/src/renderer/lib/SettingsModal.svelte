<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import Keyboard from '@lucide/svelte/icons/keyboard'
  import X from '@lucide/svelte/icons/x'
  import { SHORTCUTS } from '$shared/shortcuts'
  import Key from './Key.svelte'
  import Toggle from './Toggle.svelte'
  import { onboarding } from './onboarding.svelte'
  import { settings } from './settings.svelte'

  interface Props {
    open: boolean
    onClose: () => void
  }

  let { open, onClose }: Props = $props()

  let showShortcuts = $state(false)

  const title = $derived(showShortcuts ? 'Keyboard shortcuts' : 'Settings')

  $effect(() => {
    if (open) {
      showShortcuts = false
    }
  })

  function onKeydown(event: KeyboardEvent): void {
    if (open && event.key === 'Escape') {
      onClose()
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <div class="modal" role="dialog" aria-modal="true" aria-label={title}>
    <button class="backdrop" aria-label="Close settings" onclick={onClose}></button>

    <div class="panel">
      <header>
        <h2>{title}</h2>

        <div class="actions">
          {#if showShortcuts}
            <button
              class="icon"
              title="Back to settings"
              aria-label="Back to settings"
              onclick={() => (showShortcuts = false)}
            >
              <ArrowLeft size={16} strokeWidth={1.8} />
            </button>
          {:else}
            <button
              class="icon"
              title="Keyboard shortcuts"
              aria-label="Keyboard shortcuts"
              onclick={() => (showShortcuts = true)}
            >
              <Keyboard size={16} strokeWidth={1.8} />
            </button>
          {/if}

          <button class="icon" title="Close" aria-label="Close" onclick={onClose}>
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {#if showShortcuts}
        <div class="body">
          <section>
            {#each SHORTCUTS as shortcut (shortcut.command)}
              <div class="row">
                <div class="info">
                  <div class="label">{shortcut.description}</div>
                </div>
                <div class="keys">
                  {#each shortcut.chords as chord, index (chord.label)}
                    {#if index > 0}<span class="or">or</span>{/if}
                    <Key label={chord.label} />
                  {/each}
                </div>
              </div>
            {/each}
          </section>
        </div>
      {:else}
        <div class="body">
          <section>
            <h3>General</h3>

            <div class="row">
              <div class="info">
                <div class="label">Always on top</div>
                <div class="description">Keep the window above other windows</div>
              </div>
              <Toggle
                label="Always on top"
                checked={settings.current.alwaysOnTop}
                onchange={(value) => settings.set('alwaysOnTop', value)}
              />
            </div>

            <div class="row">
              <div class="info">
                <div class="label">Desktop notifications</div>
                <div class="description">Let both sites send system notifications</div>
              </div>
              <Toggle
                label="Desktop notifications"
                checked={settings.current.notificationsEnabled}
                onchange={(value) => settings.set('notificationsEnabled', value)}
              />
            </div>

            <div class="row">
              <div class="info">
                <div class="label">Show introduction again</div>
                <div class="description">Replay the first-run walkthrough</div>
              </div>
              <button
                class="action"
                onclick={() => {
                  onClose()
                  onboarding.start()
                }}
              >
                Replay
              </button>
            </div>
          </section>

          <section>
            <h3>Integrations</h3>

            <div class="row">
              <div class="info">
                <div class="label">Discord Rich Presence</div>
                <div class="description">Show what you're playing on your Discord profile</div>
              </div>
              <Toggle
                label="Discord Rich Presence"
                checked={settings.current.discordRpcEnabled}
                onchange={(value) => settings.set('discordRpcEnabled', value)}
              />
            </div>
          </section>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: grid;
    place-items: center;
    padding: var(--cd-space-5);
  }

  .backdrop {
    position: absolute;
    inset: 0;
    border: 0;
    padding: 0;
    background: rgba(0, 0, 0, 0.55);
    cursor: default;
    animation: fade 140ms ease;
  }

  .panel {
    position: relative;
    width: min(520px, 100%);
    max-height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--cd-surface);
    border: 1px solid var(--cd-border);
    border-radius: var(--cd-radius-lg);
    box-shadow: var(--cd-shadow-modal);
    overflow: hidden;
    animation: rise 160ms ease;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--cd-space-4) var(--cd-space-5);
    border-bottom: 1px solid var(--cd-border);
  }

  h2 {
    margin: 0;
    font-size: var(--cd-font-size-lg);
    font-weight: 600;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--cd-space-1);
  }

  .icon {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border: 0;
    border-radius: var(--cd-radius-sm);
    background: transparent;
    color: var(--cd-text-muted);
    cursor: pointer;
    transition: background var(--cd-transition), color var(--cd-transition);
  }

  .icon:hover {
    background: var(--cd-surface-hover);
    color: var(--cd-text);
  }

  .body {
    padding: var(--cd-space-2) var(--cd-space-5) var(--cd-space-5);
    overflow-y: auto;
  }

  section {
    margin-top: var(--cd-space-4);
  }

  h3 {
    margin: 0 0 var(--cd-space-2);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--cd-text-subtle);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--cd-space-4);
    padding: var(--cd-space-3) 0;
    border-bottom: 1px solid var(--cd-border);
  }

  .row:last-child {
    border-bottom: 0;
  }

  .label {
    display: flex;
    align-items: center;
    gap: var(--cd-space-2);
    font-weight: 500;
  }

  .keys {
    display: flex;
    align-items: center;
    flex: none;
    gap: var(--cd-space-2);
  }

  .or {
    font-size: var(--cd-font-size-sm);
    color: var(--cd-text-subtle);
  }

  .description {
    margin-top: 2px;
    font-size: var(--cd-font-size-sm);
    color: var(--cd-text-muted);
    line-height: 1.4;
  }

  .action {
    flex: none;
    padding: 6px 14px;
    border: 1px solid var(--cd-border);
    border-radius: var(--cd-radius-sm);
    background: var(--cd-surface-raised);
    color: var(--cd-text);
    font-family: inherit;
    font-size: var(--cd-font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition:
      background var(--cd-transition),
      border-color var(--cd-transition);
  }

  .action:hover {
    background: var(--cd-surface-hover);
    border-color: var(--cd-text-subtle);
  }

  .action:focus-visible {
    outline: 2px solid var(--cd-accent);
    outline-offset: 2px;
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }
  }
</style>
