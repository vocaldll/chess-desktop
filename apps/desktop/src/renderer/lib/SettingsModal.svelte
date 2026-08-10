<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import Keyboard from '@lucide/svelte/icons/keyboard'
  import X from '@lucide/svelte/icons/x'
  import {
    normalizeShortcutKey,
    resolveShortcutChord,
    shortcutChordMatchesBinding,
    SHORTCUTS,
    type Shortcut,
    type ShortcutAction,
    type ShortcutBinding
  } from '$shared/shortcuts'
  import Key from './Key.svelte'
  import Toggle from './Toggle.svelte'
  import GitHubMark from './marks/GitHubMark.svelte'
  import { settings } from './settings.svelte'
  import { updates } from './updates.svelte'

  interface Props {
    open: boolean
    onClose: () => void
  }

  let { open, onClose }: Props = $props()

  interface EditingShortcut {
    command: ShortcutAction
    index: number
  }

  let showShortcuts = $state(false)
  let editingShortcut = $state<EditingShortcut | null>(null)
  let recordingError = $state('')

  const discordBetaNotice =
    'Discord status detection is still being tested and may sometimes be inaccurate.'

  const opponentBetaNotice =
    'Opponent detection is still being tested and some screens may still show their name.'

  const title = $derived(showShortcuts ? 'Keyboard shortcuts' : 'Settings')
  const hasShortcutOverrides = $derived(
    Object.keys(settings.current.shortcutOverrides).length > 0
  )
  const updateButtonDisabled = $derived(
    updates.downloadedVersion
      ? updates.installing
      : updates.checking ||
          !updates.info?.canCheck ||
          updates.checkResult?.status === 'available' ||
          updates.checkResult?.status === 'unsupported'
  )
  const updateButtonLabel = $derived.by(() => {
    if (updates.installing) {
      return 'Restarting'
    }

    if (updates.downloadedVersion) {
      return 'Restart to update'
    }

    if (updates.checking) {
      return 'Checking…'
    }

    if (updates.checkResult?.status === 'current') {
      return 'Up to date'
    }

    if (updates.checkResult?.status === 'available') {
      return 'Downloading…'
    }

    if (updates.checkResult?.status === 'error') {
      return 'Try again'
    }

    if (updates.checkResult?.status === 'unsupported') {
      return 'Unavailable'
    }

    return 'Check for updates'
  })
  const updateButtonTitle = $derived.by(() => {
    if (updates.downloadedVersion) {
      return `Restart to update to version ${updates.downloadedVersion}`
    }

    if (updates.checking) {
      return 'Checking for updates'
    }

    if (updates.infoFailed) {
      return 'Update information is unavailable'
    }

    if (
      updates.checkResult?.status === 'unsupported' ||
      (updates.info && !updates.info.canCheck)
    ) {
      return 'Update checks are unavailable for this build'
    }

    if (updates.checkResult?.status === 'available') {
      return `Version ${updates.checkResult.version} is downloading in the background`
    }

    if (updates.checkResult?.status === 'error') {
      return "Couldn't check for updates"
    }

    if (updates.checkResult?.status === 'current') {
      return "You're up to date"
    }

    return 'Check for updates'
  })

  $effect(() => {
    if (open) {
      showShortcuts = false
      editingShortcut = null
      recordingError = ''
      if (!updates.info) {
        void updates.loadInfo()
      }
    }
  })

  $effect(() => {
    const recording = open && showShortcuts && editingShortcut !== null
    window.api.shortcuts.setRecording(recording)

    return () => {
      if (recording) {
        window.api.shortcuts.setRecording(false)
      }
    }
  })

  function onUpdateClick(): void {
    if (updates.downloadedVersion) {
      updates.install()
    } else {
      void updates.check()
    }
  }

  function chordFor(shortcut: Shortcut, index: number) {
    return resolveShortcutChord(shortcut, index, settings.current.shortcutOverrides)
  }

  function isEditing(command: ShortcutAction, index: number): boolean {
    return editingShortcut?.command === command && editingShortcut.index === index
  }

  function beginEditing(command: ShortcutAction, index: number): void {
    editingShortcut = { command, index }
    recordingError = ''
  }

  function stopEditing(): void {
    editingShortcut = null
    recordingError = ''
  }

  function showSettings(): void {
    stopEditing()
    showShortcuts = false
  }

  async function setShortcutOverride(
    command: ShortcutAction,
    index: number,
    binding: ShortcutBinding | null
  ): Promise<void> {
    const shortcutOverrides = $state.snapshot(settings.current.shortcutOverrides)
    await settings.set('shortcutOverrides', {
      ...shortcutOverrides,
      [command]: {
        ...shortcutOverrides[command],
        [index]: binding
      }
    })
  }

  async function removeShortcut(command: ShortcutAction, index: number): Promise<void> {
    stopEditing()
    await setShortcutOverride(command, index, null)
  }

  async function resetAllShortcuts(): Promise<void> {
    stopEditing()
    await settings.set('shortcutOverrides', {})
  }

  function findConflict(
    command: ShortcutAction,
    index: number,
    binding: ShortcutBinding
  ): Shortcut | undefined {
    return SHORTCUTS.find((shortcut) =>
      shortcut.chords.some((_, candidateIndex) => {
        if (shortcut.command === command && candidateIndex === index) {
          return false
        }

        const chord = chordFor(shortcut, candidateIndex)
        return chord !== null && shortcutChordMatchesBinding(chord, binding)
      })
    )
  }

  async function recordShortcut(event: KeyboardEvent): Promise<void> {
    const editing = editingShortcut
    if (!editing || event.repeat) {
      return
    }

    if (event.key === 'Escape') {
      stopEditing()
      return
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      await removeShortcut(editing.command, editing.index)
      return
    }

    if (['Alt', 'AltGraph', 'Control', 'Meta', 'Shift'].includes(event.key)) {
      return
    }

    if (event.metaKey) {
      recordingError = 'System key unsupported'
      return
    }

    const binding: ShortcutBinding = {
      key: normalizeShortcutKey(event.key),
      control: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey
    }
    const hasModifier = binding.control || binding.alt || binding.shift
    const isFunctionKey = /^F(?:[1-9]|1[0-2])$/.test(binding.key)

    if (!hasModifier && !isFunctionKey) {
      recordingError = 'Modifier required'
      return
    }

    const conflict = findConflict(editing.command, editing.index, binding)
    if (conflict) {
      recordingError = 'Not available'
      return
    }

    stopEditing()
    await setShortcutOverride(editing.command, editing.index, binding)
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!open) {
      return
    }

    if (editingShortcut) {
      event.preventDefault()
      event.stopPropagation()
      void recordShortcut(event)
      return
    }

    if (event.key === 'Escape') {
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
        <div class="heading">
          <h2>{title}</h2>
          {#if !showShortcuts && updates.info}
            <span class="version">v{updates.info.version}</span>
          {/if}
        </div>

        <div class="actions">
          {#if showShortcuts}
            {#if hasShortcutOverrides}
              <button
                class="reset-all"
                title="Reset all shortcuts to their defaults"
                onclick={() => void resetAllShortcuts()}
              >
                Reset all
              </button>
            {/if}

            <button
              class="icon"
              title="Back to settings"
              aria-label="Back to settings"
              onclick={showSettings}
            >
              <ArrowLeft size={16} strokeWidth={1.8} />
            </button>
          {:else}
            <button
              class="update-check"
              class:error={updates.checkResult?.status === 'error'}
              title={updateButtonTitle}
              disabled={updateButtonDisabled}
              onclick={onUpdateClick}
              aria-live="polite"
            >
              {updateButtonLabel}
            </button>

            <button
              class="icon"
              title="View on GitHub"
              aria-label="View Chess Desktop on GitHub"
              onclick={() => window.api.links.openRepository()}
            >
              <GitHubMark size={16} />
            </button>

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
              <div
                class="row shortcut-row"
                class:editing={editingShortcut?.command === shortcut.command}
              >
                <div class="info">
                  <div class="label">{shortcut.description}</div>
                </div>

                <div class="shortcut-controls">
                  <div class="keys">
                    {#each shortcut.chords as _, index}
                      {@const chord = chordFor(shortcut, index)}
                      {#if index > 0}<span class="or">or</span>{/if}

                      {#if shortcut.customizable === false}
                        <span title="This shortcut is fixed">
                          <Key label={chord?.label ?? 'None'} />
                        </span>
                      {:else}
                        <button
                          type="button"
                          class="shortcut-key"
                          class:editing-slot={isEditing(shortcut.command, index)}
                          title={`Edit ${shortcut.description.toLowerCase()} shortcut`}
                          aria-label={`Edit ${shortcut.description.toLowerCase()} shortcut ${index + 1}`}
                          onclick={() => beginEditing(shortcut.command, index)}
                        >
                          {#if isEditing(shortcut.command, index)}
                            <span class="recorder" aria-live="polite">
                              {#if recordingError}
                                <span class="error">{recordingError}</span>
                              {:else}
                                <span>
                                  Press keys<span class="waiting-dots" aria-hidden="true">
                                    <span>.</span><span>.</span><span>.</span>
                                  </span>
                                </span>
                              {/if}
                              <span class="recording-hint">Esc cancel · Del remove</span>
                            </span>
                          {:else}
                            <Key label={chord?.label ?? 'None'} />
                          {/if}
                        </button>
                      {/if}
                    {/each}
                  </div>
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
          </section>

          <section>
            <h3>Gameplay</h3>

            <div class="row">
              <div class="info">
                <div class="label">
                  Hide opponent
                  <span
                    class="beta"
                    title={opponentBetaNotice}
                    aria-label={`Beta: ${opponentBetaNotice}`}
                  >BETA</span>
                </div>
                <div class="description">Anonymize your opponent's name, avatar, and rating</div>
              </div>
              <Toggle
                label="Hide opponent"
                checked={settings.current.hideOpponent}
                onchange={(value) => settings.set('hideOpponent', value)}
              />
            </div>

            <div class="row">
              <div class="info">
                <div class="label">Hide ratings</div>
                <div class="description">Hide both players' ratings across both sites</div>
              </div>
              <Toggle
                label="Hide ratings"
                checked={settings.current.hideRatings}
                onchange={(value) => settings.set('hideRatings', value)}
              />
            </div>

            <div class="row">
              <div class="info">
                <div class="label">Hide chat</div>
                <div class="description">Hide chat across Chess.com and Lichess</div>
              </div>
              <Toggle
                label="Hide chat"
                checked={settings.current.hideChat}
                onchange={(value) => settings.set('hideChat', value)}
              />
            </div>
          </section>

          <section>
            <h3>Integrations</h3>

            <div class="row">
              <div class="info">
                <div class="label">
                  Discord Rich Presence
                  <span
                    class="beta"
                    title={discordBetaNotice}
                    aria-label={`Beta: ${discordBetaNotice}`}
                  >BETA</span>
                </div>
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

  .heading {
    display: flex;
    align-items: baseline;
    gap: var(--cd-space-2);
  }

  .version {
    color: var(--cd-text-subtle);
    font-size: var(--cd-font-size-sm);
    font-weight: 500;
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

  .reset-all {
    height: 28px;
    padding: 0 9px;
    border: 0;
    border-radius: var(--cd-radius-sm);
    background: transparent;
    color: var(--cd-text-muted);
    font-family: inherit;
    font-size: var(--cd-font-size-sm);
    cursor: pointer;
    transition: background var(--cd-transition), color var(--cd-transition);
  }

  .reset-all:hover {
    background: var(--cd-surface-hover);
    color: var(--cd-text);
  }

  .reset-all:focus-visible {
    outline: 2px solid var(--cd-accent);
    outline-offset: 2px;
  }

  .update-check {
    height: 28px;
    padding: 0 10px;
    border: 1px solid var(--cd-border);
    border-radius: var(--cd-radius-sm);
    background: var(--cd-surface-raised);
    color: var(--cd-text-muted);
    font-family: inherit;
    font-size: var(--cd-font-size-sm);
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background var(--cd-transition),
      border-color var(--cd-transition),
      color var(--cd-transition);
  }

  .update-check:hover:not(:disabled) {
    background: var(--cd-surface-hover);
    border-color: var(--cd-text-subtle);
    color: var(--cd-text);
  }

  .update-check:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .update-check.error {
    color: var(--cd-danger);
  }

  .update-check:focus-visible {
    outline: 2px solid var(--cd-accent);
    outline-offset: 2px;
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

  .info {
    min-width: 0;
  }

  .shortcut-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 190px;
    width: 100%;
    min-height: 45px;
    border-bottom: 1px solid var(--cd-border);
    background: transparent;
    color: var(--cd-text);
    transition: background var(--cd-transition);
  }

  .shortcut-row.editing {
    background: var(--cd-surface-raised);
  }

  .label {
    display: flex;
    align-items: center;
    gap: var(--cd-space-2);
    font-weight: 500;
  }

  .beta {
    display: inline-flex;
    align-items: center;
    height: 16px;
    padding: 0 5px;
    border: 1px solid color-mix(in srgb, var(--cd-brand) 45%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--cd-brand) 12%, transparent);
    color: var(--cd-brand-hover);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    line-height: 1;
    cursor: help;
  }

  .keys {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex: none;
    gap: var(--cd-space-2);
  }

  .shortcut-controls {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 190px;
  }

  .shortcut-key {
    display: flex;
    padding: 2px;
    border: 0;
    border-radius: var(--cd-radius-sm);
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .shortcut-key:hover,
  .shortcut-key:focus-visible {
    background: var(--cd-accent-soft);
  }

  .shortcut-key:focus-visible {
    outline: 2px solid var(--cd-accent);
    outline-offset: 1px;
  }

  .shortcut-key.editing-slot {
    padding: 0;
  }

  .recorder {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 116px;
    max-width: 116px;
    min-width: 0;
    padding: 4px 8px;
    border: 1px solid var(--cd-accent);
    border-radius: var(--cd-radius-sm);
    background: var(--cd-surface-raised);
    box-shadow: 0 0 0 2px var(--cd-accent-soft);
    color: var(--cd-accent);
    font-size: var(--cd-font-size-sm);
    font-weight: 600;
    overflow-wrap: anywhere;
    text-align: center;
  }

  .recorder > span {
    display: block;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    white-space: normal;
    word-break: break-word;
  }

  .recorder .error {
    color: var(--cd-danger);
  }

  .waiting-dots {
    display: inline-flex;
  }

  .waiting-dots span {
    opacity: 0.25;
    animation: waiting-dot 1.2s ease-in-out infinite;
  }

  .waiting-dots span:nth-child(2) {
    animation-delay: 150ms;
  }

  .waiting-dots span:nth-child(3) {
    animation-delay: 300ms;
  }

  .recording-hint {
    margin-top: 2px;
    color: var(--cd-text-subtle);
    font-size: 11px;
    font-weight: 400;
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

  @keyframes waiting-dot {
    40% {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .waiting-dots span {
      opacity: 1;
      animation: none;
    }
  }

</style>
