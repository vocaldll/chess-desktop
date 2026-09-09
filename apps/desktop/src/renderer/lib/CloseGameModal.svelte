<script lang="ts">
  import Clock3 from '@lucide/svelte/icons/clock-3'
  import { onMount } from 'svelte'

  let dialog: HTMLDialogElement
  let keepPlaying: HTMLButtonElement

  function respond(confirmed: boolean): void {
    dialog.close()
    window.api.shortcuts.setRecording(false)
    window.api.window.respondToClose(confirmed)
  }

  onMount(() => {
    const unsubscribe = window.api.window.onCloseRequested(() => {
      dialog.showModal()
      keepPlaying.focus()
      window.api.shortcuts.setRecording(true)
    })
    return () => {
      unsubscribe()
      if (dialog.open) window.api.shortcuts.setRecording(false)
    }
  })
</script>

<dialog
  bind:this={dialog}
  aria-labelledby="close-game-title"
  aria-describedby="close-game-description"
  onkeydown={(event) => event.stopPropagation()}
  oncancel={(event) => {
    event.preventDefault()
    respond(false)
  }}
>
  <div class="body">
    <div class="status"><Clock3 size={15} strokeWidth={1.8} /> Game in progress</div>
    <h2 id="close-game-title">Leave your game?</h2>
    <p id="close-game-description">Closing Chess Desktop won’t stop the clock. You could lose on time.</p>
  </div>
  <footer>
    <button type="button" class="leave" onclick={() => respond(true)}>Close app</button>
    <button type="button" class="keep-playing" bind:this={keepPlaying} onclick={() => respond(false)}>Keep playing</button>
  </footer>
</dialog>

<style>
  dialog {
    width: min(420px, calc(100vw - 48px));
    padding: 0;
    color: var(--cd-text);
    background: var(--cd-surface);
    border: 1px solid var(--cd-border);
    border-radius: var(--cd-radius-lg);
    box-shadow: var(--cd-shadow-modal);
  }

  dialog::backdrop {
    background: rgba(0, 0, 0, 0.55);
  }

  .body {
    padding: var(--cd-space-6);
  }

  .status {
    display: flex;
    align-items: center;
    gap: var(--cd-space-2);
    color: var(--cd-accent);
    font-size: var(--cd-font-size-sm);
    font-weight: 500;
  }

  h2 {
    margin: var(--cd-space-4) 0 var(--cd-space-2);
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    color: var(--cd-text-muted);
    font-size: var(--cd-font-size);
    line-height: 1.6;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--cd-space-3);
    padding: var(--cd-space-4) var(--cd-space-6);
    border-top: 1px solid var(--cd-border);
  }

  button {
    min-height: 36px;
    padding: 8px 14px;
    border: 1px solid transparent;
    border-radius: var(--cd-radius);
    font-size: var(--cd-font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: background var(--cd-transition), color var(--cd-transition);
  }

  button:focus-visible {
    outline: 2px solid var(--cd-accent);
    outline-offset: 3px;
  }

  .leave {
    border-color: var(--cd-border);
    background: transparent;
    color: var(--cd-text-muted);
  }

  .leave:hover {
    background: var(--cd-surface-raised);
    color: var(--cd-text);
  }

  .keep-playing {
    background: var(--cd-accent);
    color: var(--cd-accent-contrast);
  }

  .keep-playing:hover {
    background: var(--cd-accent-hover);
  }

  @media (prefers-reduced-motion: reduce) {
    button { transition: none; }
  }
</style>
