<script lang="ts">
  import { SITE_ORDER, SITES, type SiteId } from '$shared/sites'
  import ChessComMark from './marks/ChessComMark.svelte'
  import LichessMark from './marks/LichessMark.svelte'
  import { anchor } from './onboarding.svelte'
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

<div class="switcher" role="group" aria-label="Chess site" use:anchor={'switcher'}>
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
      <Mark size={15} />
    </button>
  {/each}
</div>

<style>
  .switcher {
    display: flex;
    align-items: center;
    flex: none;
    gap: 1px;
    -webkit-app-region: no-drag;
  }

  .site {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 0;
    border-radius: var(--cd-radius-sm);
    background: transparent;
    color: var(--cd-text-muted);
    cursor: pointer;
    opacity: 0.35;
    transition:
      opacity var(--cd-transition),
      color var(--cd-transition);
  }

  .site:hover {
    opacity: 0.7;
  }

  .site.active {
    color: var(--cd-text);
    opacity: 1;
  }

  .site:focus-visible {
    outline: 2px solid var(--cd-accent);
    outline-offset: -2px;
  }
</style>
