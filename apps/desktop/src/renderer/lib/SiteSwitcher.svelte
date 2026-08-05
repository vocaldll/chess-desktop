<script lang="ts">
  import { SITE_ORDER, SITES, type SiteId } from '$shared/sites'
  import ChessComMark from './marks/ChessComMark.svelte'
  import LichessMark from './marks/LichessMark.svelte'
  import { settings } from './settings.svelte'

  const marks = {
    chesscom: ChessComMark,
    lichess: LichessMark
  }

  function select(id: SiteId): void {
    if (settings.current.activeSite !== id) {
      settings.set('activeSite', id)
    }
  }
</script>

<div class="switcher" role="group" aria-label="Chess site">
  {#each SITE_ORDER as id (id)}
    {@const Mark = marks[id]}
    {@const active = settings.current.activeSite === id}
    <button
      class="site"
      class:active
      title={SITES[id].name}
      aria-label={SITES[id].name}
      aria-pressed={active}
      onclick={() => select(id)}
    >
      <Mark size={17} />
    </button>
  {/each}
</div>

<style>
  .switcher {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px;
    background: var(--cd-background);
    border-radius: 999px;
    -webkit-app-region: no-drag;
  }

  .site {
    display: grid;
    place-items: center;
    width: 28px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--cd-text-subtle);
    cursor: pointer;
    opacity: 0.4;
    transition:
      background var(--cd-transition),
      opacity var(--cd-transition),
      color var(--cd-transition);
  }

  .site:hover {
    opacity: 0.75;
    color: var(--cd-text-muted);
  }

  .site.active {
    background: var(--cd-surface-hover);
    color: var(--cd-text);
    opacity: 1;
  }

  .site:focus-visible {
    outline: 2px solid var(--cd-accent);
    outline-offset: -2px;
  }
</style>
