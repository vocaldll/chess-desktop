import { repository, site } from '../site'
import { formatStars, useGitHubStars } from '../useGitHubStars'
import DownloadButton from './DownloadButton'
import GitHubMark from './GitHubMark'
import StarMark from './StarMark'

export default function Hero() {
  const stars = useGitHubStars()

  return (
    <section className="flex w-full min-w-0 flex-col items-center">
      <div className="rise flex items-center gap-2.5">
        <img className="block shrink-0 rounded-md" src="/logo.png" width={28} height={28} alt="" />
        <span className="font-display font-semibold text-[16px] tracking-tight">{site.name}</span>
      </div>

      <h1
        className="rise mt-6 max-w-[20ch] text-balance font-bold font-display text-[clamp(2rem,1.05rem+4.2vw,3.25rem)] leading-[1.06] tracking-[-0.035em]"
        style={{ animationDelay: '60ms' }}
      >
        {site.tagline}
      </h1>

      <p
        className="rise mt-5 max-w-[52ch] text-pretty text-[clamp(1rem,0.95rem+0.35vw,1.125rem)] text-ink-muted"
        style={{ animationDelay: '120ms' }}
      >
        {site.description}
      </p>

      <div
        className="rise mt-8 flex w-full flex-col items-center gap-4"
        style={{ animationDelay: '180ms' }}
        data-nosnippet=""
      >
        <DownloadButton />

        <a
          className="inline-flex items-center gap-2 font-medium text-[14px] text-ink-muted transition-colors hover:text-ink"
          href={repository}
          target="_blank"
          rel="noreferrer"
        >
          <GitHubMark size={16} />
          View on GitHub
          <span
            className={`ml-0.5 inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums ${stars === null ? 'invisible' : ''}`}
            aria-hidden={stars === null}
          >
            <StarMark />
            {stars === null ? '0' : formatStars(stars)}
          </span>
        </a>
      </div>
    </section>
  )
}
