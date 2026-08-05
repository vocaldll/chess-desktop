<script lang="ts">
  import { latestRelease, site } from '$lib/site'

  const features = [
    {
      title: 'A real window',
      body: 'Custom titlebar with back, forward and reload built in. No tabs, no address bar, no bookmarks bar stealing your board space.'
    },
    {
      title: 'Stays logged in',
      body: 'A dedicated persistent session means you sign in once and stay signed in between launches.'
    },
    {
      title: 'Settings that belong here',
      body: 'Mute every sound, pin the window above everything else, and more desktop-only options on the way.'
    },
    {
      title: 'Links go where they should',
      body: 'Off-site links open in your normal browser, so the app never wanders away from the board.'
    }
  ]
</script>

<svelte:head>
  <title>{site.name} — {site.tagline}</title>
  <meta name="description" content={site.description} />
</svelte:head>

<main>
  <section class="hero">
    <p class="eyebrow">Unofficial desktop client</p>
    <h1>{site.tagline}</h1>
    <p class="lede">{site.description}</p>

    <div class="actions">
      <a class="button primary" href={latestRelease}>Download for Windows</a>
      <a class="button" href={latestRelease}>Download for Linux</a>
    </div>

    <p class="note">Free and open source. Windows 10+ and modern Linux distributions.</p>
  </section>

  <section class="features">
    {#each features as feature (feature.title)}
      <article>
        <h2>{feature.title}</h2>
        <p>{feature.body}</p>
      </article>
    {/each}
  </section>

  <footer>
    <span>{site.domain}</span>
    <a href={site.repository}>Source on GitHub</a>
  </footer>
</main>

<style>
  main {
    width: min(1040px, 100% - 48px);
    margin: 0 auto;
  }

  .hero {
    padding: clamp(72px, 14vh, 140px) 0 clamp(48px, 8vh, 88px);
    text-align: center;
  }

  .eyebrow {
    margin: 0 0 var(--cd-space-4);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--cd-accent);
  }

  h1 {
    margin: 0 auto var(--cd-space-4);
    max-width: 16ch;
    font-size: clamp(2.5rem, 6vw, 4rem);
    line-height: 1.05;
    letter-spacing: -0.03em;
    font-weight: 700;
  }

  .lede {
    margin: 0 auto;
    max-width: 56ch;
    font-size: clamp(1rem, 2vw, 1.15rem);
    color: var(--cd-text-muted);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--cd-space-3);
    margin-top: var(--cd-space-6);
  }

  .button {
    padding: 13px 26px;
    border: 1px solid var(--cd-border);
    border-radius: var(--cd-radius);
    background: var(--cd-surface);
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;
  }

  .button:hover {
    border-color: var(--cd-text-subtle);
    transform: translateY(-1px);
  }

  .primary {
    background: var(--cd-accent);
    border-color: var(--cd-accent);
    color: var(--cd-accent-contrast);
  }

  .primary:hover {
    background: var(--cd-accent-hover);
    border-color: var(--cd-accent-hover);
  }

  .note {
    margin-top: var(--cd-space-4);
    font-size: 13px;
    color: var(--cd-text-subtle);
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--cd-space-4);
    padding-bottom: clamp(48px, 8vh, 88px);
  }

  article {
    padding: var(--cd-space-5);
    background: var(--cd-surface);
    border: 1px solid var(--cd-border);
    border-radius: var(--cd-radius-lg);
  }

  article h2 {
    margin: 0 0 var(--cd-space-2);
    font-size: 1.05rem;
    font-weight: 600;
  }

  article p {
    margin: 0;
    font-size: 15px;
    color: var(--cd-text-muted);
  }

  footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--cd-space-3);
    padding: var(--cd-space-5) 0 var(--cd-space-6);
    border-top: 1px solid var(--cd-border);
    font-size: 14px;
    color: var(--cd-text-subtle);
  }
</style>
