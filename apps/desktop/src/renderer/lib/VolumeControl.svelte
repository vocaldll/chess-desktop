<script lang="ts">
  import Volume1 from '@lucide/svelte/icons/volume-1'
  import Volume2 from '@lucide/svelte/icons/volume-2'
  import VolumeX from '@lucide/svelte/icons/volume-x'
  import { MAX_VOLUME, MIN_VOLUME } from '$shared/volume'
  import { anchor } from './onboarding.svelte'
  import { settings } from './settings.svelte'

  const ICON = 16
  const POPOVER_ICON = 14
  const STROKE = 1.8
  const HALF = 50

  let open = $state(false)
  let level = $state(settings.current.volume)

  const muted = $derived(settings.current.soundMuted)
  const silent = $derived(muted || level === MIN_VOLUME)

  const Icon = $derived(silent ? VolumeX : level < HALF ? Volume1 : Volume2)

  $effect(() => {
    const stored = settings.current.volume

    if (!open) {
      level = stored
    }
  })

  $effect(() => {
    if (!open) {
      return
    }

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        open = false
      }
    }

    document.addEventListener('keydown', onKeydown)

    return () => {
      document.removeEventListener('keydown', onKeydown)
    }
  })

  function preview(percent: number): void {
    window.api.audio.setVolume(percent)
  }

  function commit(percent: number): void {
    settings.set('volume', percent)

    if (muted && percent > MIN_VOLUME) {
      settings.set('soundMuted', false)
    }
  }

  function toggleMute(): void {
    settings.set('soundMuted', !muted)
  }
</script>

<div class="volume">
  <button
    class="btn"
    title="Volume"
    aria-label="Volume"
    aria-expanded={open}
    onclick={() => (open = !open)}
    use:anchor={'volume'}
  >
    <Icon size={ICON} strokeWidth={STROKE} />
  </button>

  {#if open}
    <button class="dismiss" aria-label="Close volume" onclick={() => (open = false)}></button>

    <div class="popover">
      <button
        class="mute"
        title={muted ? 'Unmute' : 'Mute'}
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
        onclick={toggleMute}
      >
        <Icon size={POPOVER_ICON} strokeWidth={STROKE} />
      </button>

      <input
        class="slider"
        class:silent
        style={`--fill: ${level}%`}
        type="range"
        min={MIN_VOLUME}
        max={MAX_VOLUME}
        step="1"
        bind:value={level}
        aria-label="Volume level"
        oninput={(event) => preview(Number(event.currentTarget.value))}
        onchange={(event) => commit(Number(event.currentTarget.value))}
      />

      <span class="value">{level}%</span>
    </div>
  {/if}
</div>

<style>
  .volume {
    position: relative;
    display: flex;
    align-items: center;
    -webkit-app-region: no-drag;
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

  .btn:hover {
    background: var(--cd-surface-hover);
    color: var(--cd-text);
  }

  .btn:focus-visible {
    outline: 2px solid var(--cd-accent);
    outline-offset: -2px;
  }

  .dismiss {
    position: fixed;
    inset: 0;
    z-index: 19;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: default;
    -webkit-app-region: no-drag;
  }

  .popover {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: var(--cd-space-2);
    width: 208px;
    padding: 8px 10px;
    border: 1px solid var(--cd-border);
    border-radius: var(--cd-radius);
    background: var(--cd-surface-raised);
    box-shadow: var(--cd-shadow-popover);
    animation: popover-in 120ms ease;
  }

  .mute {
    display: grid;
    place-items: center;
    flex: none;
    width: 24px;
    height: 24px;
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

  .mute:hover {
    background: var(--cd-surface-hover);
    color: var(--cd-text);
  }

  .mute:focus-visible {
    outline: 2px solid var(--cd-accent);
    outline-offset: -2px;
  }

  .slider {
    flex: 1;
    min-width: 0;
    height: 4px;
    margin: 0;
    border-radius: 999px;
    background: linear-gradient(
      to right,
      var(--cd-accent) 0 var(--fill),
      var(--cd-border) var(--fill) 100%
    );
    appearance: none;
    cursor: pointer;
    transition: opacity var(--cd-transition);
  }

  .slider.silent {
    opacity: 0.4;
  }

  .slider::-webkit-slider-thumb {
    width: 12px;
    height: 12px;
    border: 0;
    border-radius: 999px;
    background: var(--cd-accent);
    appearance: none;
    cursor: pointer;
  }

  .slider:focus-visible {
    outline: 2px solid var(--cd-accent);
    outline-offset: 4px;
  }

  .value {
    flex: none;
    width: 34px;
    color: var(--cd-text-muted);
    font-size: var(--cd-font-size-sm);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  @keyframes popover-in {
    from {
      opacity: 0;
      transform: translateY(-3px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .popover {
      animation: none;
    }
  }
</style>
