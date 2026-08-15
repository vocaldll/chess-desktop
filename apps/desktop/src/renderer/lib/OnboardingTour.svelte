<script lang="ts">
  import { SITE_ORDER, SITES, type SiteId } from '$shared/sites'
  import ChessComMark from './marks/ChessComMark.svelte'
  import LichessMark from './marks/LichessMark.svelte'
  import { onboarding, STEPS } from './onboarding.svelte'
  import { settings } from './settings.svelte'

  const marks = {
    chesscom: ChessComMark,
    lichess: LichessMark
  }

  const SPOTLIGHT_PAD = 2
  const MIN_SPOTLIGHT_RADIUS = 4
  const CARD_WIDTH = 320
  const MARGIN = 16
  const NEAR_EDGE = 44
  const REACH = 90
  const DROP = 78

  const coachSteps = STEPS.filter((step) => step.anchor)

  let rect = $state<DOMRect | null>(null)
  let targetRadius = $state(0)
  let viewportWidth = $state(window.innerWidth)
  let controlStripLeft = $state(window.innerWidth)

  function measure(): void {
    const id = onboarding.step.anchor
    const node = id ? onboarding.anchors[id] : undefined
    const strip = onboarding.anchors.controlStrip

    rect = node ? node.getBoundingClientRect() : null
    targetRadius = node ? Number.parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0 : 0
    viewportWidth = window.innerWidth
    controlStripLeft = strip ? strip.getBoundingClientRect().left : window.innerWidth
  }

  $effect(() => {
    measure()

    const frame = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(frame)
  })

  const geometry = $derived.by(() => {
    if (!rect) {
      return null
    }

    const spot = {
      left: rect.left - SPOTLIGHT_PAD,
      top: rect.top - SPOTLIGHT_PAD,
      width: rect.width + SPOTLIGHT_PAD * 2,
      height: rect.height + SPOTLIGHT_PAD * 2,
      radius: Math.max(targetRadius + SPOTLIGHT_PAD, MIN_SPOTLIGHT_RADIUS)
    }

    const centerX = rect.left + rect.width / 2
    const spotBottom = spot.top + spot.height
    const alignRight = centerX > viewportWidth * 0.6

    const desiredStart = alignRight ? centerX + REACH : centerX - REACH
    const desiredLeft = alignRight ? desiredStart - (CARD_WIDTH - NEAR_EDGE) : desiredStart - NEAR_EDGE

    const cardLeft = Math.min(
      Math.max(MARGIN, desiredLeft),
      Math.max(MARGIN, viewportWidth - CARD_WIDTH - MARGIN)
    )
    const cardTop = spotBottom + DROP

    const startX = alignRight ? cardLeft + CARD_WIDTH - NEAR_EDGE : cardLeft + NEAR_EDGE
    const startY = cardTop - 10
    const endX = centerX
    const endY = spotBottom + 8

    return {
      spot,
      cardLeft,
      cardTop,
      path: `M ${startX} ${startY} Q ${endX} ${startY} ${endX} ${endY}`
    }
  })

  async function pick(id: SiteId): Promise<void> {
    await settings.set('activeSite', id)
    onboarding.next()
  }

  function setErrorReporting(event: Event): void {
    const input = event.currentTarget as HTMLInputElement
    void settings.set('anonymousErrorReporting', input.checked)
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!onboarding.active) {
      return
    }

    if (event.key === 'Escape') {
      onboarding.finish()
      return
    }

    if (!onboarding.pickingSite && (event.key === 'Enter' || event.key === 'ArrowRight')) {
      onboarding.next()
    }
  }
</script>

<svelte:window onkeydown={onKeydown} onresize={measure} />

{#if onboarding.active}
  <div class="onboarding" role="dialog" aria-label="Welcome">
    <div class="blocker content"></div>
    <div class="blocker chrome" style="width: {controlStripLeft}px"></div>

    {#if onboarding.pickingSite}
      <div class="scrim"></div>

      <div class="welcome">
        <h2>{onboarding.step.title}</h2>
        <p>{onboarding.step.body}</p>

        <div class="choices">
          {#each SITE_ORDER as id (id)}
            {@const Mark = marks[id]}
            <button type="button" class="choice" onclick={() => pick(id)}>
              <Mark size={40} />
              <span>{SITES[id].name}</span>
            </button>
          {/each}
        </div>

        <label class="crash-consent">
          <input
            type="checkbox"
            checked={settings.current.anonymousErrorReporting}
            onchange={setErrorReporting}
          />
          <span>
            <strong>Send anonymous crash reports</strong>
            <small>
              Share technical errors with the developer. No account, game, or page data is
              collected.
            </small>
          </span>
        </label>

        <button type="button" class="skip" onclick={() => onboarding.finish()}>
          Skip the introduction
        </button>
      </div>
    {:else if geometry}
      {@const step = onboarding.step}
      <div
        class="spotlight"
        style="left: {geometry.spot.left}px; top: {geometry.spot.top}px; width: {geometry.spot
          .width}px; height: {geometry.spot.height}px; border-radius: {geometry.spot.radius}px"
      ></div>

      {#key onboarding.index}
        <svg class="arrow" aria-hidden="true">
          <defs>
            <marker
              id="onboarding-arrowhead"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path class="head" d="M 0 1 L 9 5 L 0 9 z" />
            </marker>
          </defs>
          <path
            class="line"
            d={geometry.path}
            pathLength="1"
            stroke-width="1.6"
            stroke-linecap="round"
            marker-end="url(#onboarding-arrowhead)"
          />
        </svg>

        <div class="card" style="left: {geometry.cardLeft}px; top: {geometry.cardTop}px">
          <h2>{step.title}</h2>
          <p>{step.body}</p>

          <footer>
            <div class="dots">
              {#each coachSteps as dot (dot.id)}
                <span class="dot" class:active={dot.id === step.id}></span>
              {/each}
            </div>

            <div class="actions">
              <button type="button" class="skip" onclick={() => onboarding.finish()}>Skip</button>
              <button type="button" class="next" onclick={() => onboarding.next()}>
                {onboarding.isLast ? 'Done' : 'Next'}
              </button>
            </div>
          </footer>
        </div>
      {/key}
    {/if}
  </div>
{/if}

<style>
  .onboarding {
    position: fixed;
    inset: 0;
    z-index: 3000;
    pointer-events: none;
  }

  .blocker {
    position: absolute;
    pointer-events: auto;
  }

  .blocker.content {
    inset: var(--cd-titlebar-height) 0 0 0;
  }

  .blocker.chrome {
    left: 0;
    top: 4px;
    height: calc(var(--cd-titlebar-height) - 4px);
    -webkit-app-region: drag;
  }

  .scrim {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.62);
    pointer-events: none;
    animation: fade 140ms ease;
  }

  .spotlight {
    position: absolute;
    box-shadow:
      0 0 0 2px var(--cd-accent-soft),
      0 0 0 9999px rgba(0, 0, 0, 0.62);
    outline: 1px solid var(--cd-accent);
    pointer-events: none;
    transition:
      left var(--cd-transition),
      top var(--cd-transition),
      width var(--cd-transition),
      height var(--cd-transition),
      border-radius var(--cd-transition);
  }

  .arrow {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }

  .head {
    fill: var(--cd-accent);
  }

  .line {
    fill: none;
    stroke: var(--cd-accent);
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: draw 420ms 120ms ease forwards;
  }

  .welcome,
  .card {
    position: absolute;
    background: var(--cd-surface);
    border: 1px solid var(--cd-border);
    border-radius: var(--cd-radius-lg);
    box-shadow: var(--cd-shadow-modal);
    pointer-events: auto;
    -webkit-app-region: no-drag;
  }

  .welcome {
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(420px, calc(100% - var(--cd-space-5) * 2));
    padding: var(--cd-space-6);
    text-align: center;
    animation: center-rise 200ms ease;
  }

  .card {
    width: 320px;
    padding: var(--cd-space-4);
    animation: rise 200ms ease;
  }

  h2 {
    margin: 0 0 var(--cd-space-2);
    font-size: var(--cd-font-size-lg);
    font-weight: 600;
  }

  p {
    margin: 0;
    color: var(--cd-text-muted);
    font-size: var(--cd-font-size-sm);
    line-height: 1.5;
  }

  .welcome p {
    font-size: var(--cd-font-size);
  }

  .choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--cd-space-3);
    margin: var(--cd-space-5) 0 var(--cd-space-3);
  }

  .choice {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--cd-space-3);
    padding: var(--cd-space-5) var(--cd-space-3);
    border: 1px solid var(--cd-border);
    border-radius: var(--cd-radius);
    background: var(--cd-surface-raised);
    color: var(--cd-text);
    font-family: inherit;
    font-size: var(--cd-font-size);
    font-weight: 600;
    cursor: pointer;
    transition:
      background var(--cd-transition),
      border-color var(--cd-transition);
  }

  .choice:hover {
    background: var(--cd-surface-hover);
    border-color: var(--cd-text-subtle);
  }

  .choice:focus-visible {
    outline: 2px solid var(--cd-accent);
    outline-offset: 2px;
  }

  .crash-consent {
    display: grid;
    grid-template-columns: 16px 1fr;
    align-items: center;
    gap: var(--cd-space-3);
    margin-bottom: var(--cd-space-3);
    padding: 2px 0;
    color: var(--cd-text);
    cursor: pointer;
    text-align: left;
  }

  .crash-consent input {
    display: grid;
    place-items: center;
    appearance: none;
    width: 14px;
    height: 14px;
    margin: 0;
    border: 1px solid var(--cd-text-subtle);
    border-radius: 3px;
    background: var(--cd-surface-raised);
    cursor: pointer;
  }

  .crash-consent input::before {
    width: 7px;
    height: 4px;
    border-bottom: 2px solid var(--cd-surface);
    border-left: 2px solid var(--cd-surface);
    content: '';
    transform: translateY(-1px) rotate(-45deg) scale(0);
  }

  .crash-consent input:checked {
    border-color: var(--cd-text-subtle);
    background: var(--cd-text-subtle);
  }

  .crash-consent input:checked::before {
    transform: translateY(-1px) rotate(-45deg) scale(1);
  }

  .crash-consent strong,
  .crash-consent small {
    display: block;
  }

  .crash-consent strong {
    font-size: var(--cd-font-size-sm);
    font-weight: 600;
  }

  .crash-consent small {
    margin-top: 3px;
    color: var(--cd-text-muted);
    font-size: 11px;
    line-height: 1.4;
  }

  .crash-consent:has(input:focus-visible) {
    outline: 2px solid var(--cd-accent);
    outline-offset: 2px;
  }

  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--cd-space-4);
    margin-top: var(--cd-space-4);
  }

  .dots {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--cd-text-subtle);
    opacity: 0.5;
    transition: opacity var(--cd-transition);
  }

  .dot.active {
    background: var(--cd-accent);
    opacity: 1;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--cd-space-2);
  }

  .skip {
    padding: 6px 10px;
    border: 0;
    border-radius: var(--cd-radius-sm);
    background: transparent;
    color: var(--cd-text-muted);
    font-family: inherit;
    font-size: var(--cd-font-size-sm);
    cursor: pointer;
    transition: color var(--cd-transition);
  }

  .skip:hover {
    color: var(--cd-text);
  }

  .next {
    padding: 6px 16px;
    border: 0;
    border-radius: var(--cd-radius-sm);
    background: var(--cd-accent);
    color: var(--cd-accent-contrast);
    font-family: inherit;
    font-size: var(--cd-font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: background var(--cd-transition);
  }

  .next:hover {
    background: var(--cd-accent-hover);
  }

  .skip:focus-visible,
  .next:focus-visible {
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

  @keyframes center-rise {
    from {
      opacity: 0;
      transform: translate(-50%, calc(-50% + 8px)) scale(0.98);
    }
  }

  @keyframes draw {
    to {
      stroke-dashoffset: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .welcome,
    .card,
    .scrim {
      animation: none;
    }

    .line {
      animation: none;
      stroke-dashoffset: 0;
    }
  }
</style>
