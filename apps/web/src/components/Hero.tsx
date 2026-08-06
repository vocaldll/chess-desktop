import { latestRelease, repository, site } from '../site'
import { formatStars, useGitHubStars } from '../useGitHubStars'
import GitHubMark from './GitHubMark'

export default function Hero() {
  const stars = useGitHubStars()

  return (
    <section className="min-w-0">
      <div className="flex items-center gap-2.5">
        <img
          className="block shrink-0 rounded-md"
          src="/favicon-32x32.png"
          width={28}
          height={28}
          alt=""
        />
        <span className="font-bold font-display text-[17px] tracking-tight">{site.name}</span>
      </div>

      <h1 className="mt-6 max-w-[16ch] text-balance font-bold font-display text-[clamp(1.9rem,4.2vw,3rem)] leading-[1.08] tracking-[-0.035em]">
        {site.tagline}
      </h1>

      <p className="mt-5 max-w-[46ch] text-[clamp(0.98rem,1.3vw,1.06rem)] text-ink-muted">
        {site.description}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <a
          className="inline-flex items-center gap-2.5 rounded-xl border border-accent bg-accent px-5 py-3 font-semibold text-[15px] text-accent-ink transition-colors hover:border-accent-hover hover:bg-accent-hover"
          href={latestRelease}
        >
          <GitHubMark />
          <span>Download on GitHub</span>
          {stars !== null && (
            <span className="ml-0.5 border-black/20 border-l pl-2.5 font-medium text-[13px]">
              <span className="opacity-55">★ </span>
              {formatStars(stars)}
            </span>
          )}
        </a>

        <a
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 font-medium text-[15px] text-ink transition-colors hover:border-line-strong hover:bg-surface-2"
          href={repository}
        >
          View the source
        </a>
      </div>
    </section>
  )
}
