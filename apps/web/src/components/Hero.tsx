import { downloadLinuxArm64, downloadLinuxX64, downloadWindows, repository, site } from '../site'
import { formatStars, useGitHubStars } from '../useGitHubStars'
import GitHubMark from './GitHubMark'
import LinuxMark from './LinuxMark'
import StarMark from './StarMark'
import WindowsMark from './WindowsMark'

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
        <div className="grid w-full max-w-[360px] grid-cols-2 gap-3 min-[680px]:w-auto min-[680px]:max-w-none min-[680px]:grid-cols-[auto_auto_auto]">
          <a
            className="col-span-2 inline-flex items-center justify-center gap-2.5 rounded-full border border-[#0078d4] bg-[#0078d4] px-6 py-3 font-semibold text-[15px] text-white transition hover:-translate-y-0.5 hover:border-[#1a86da] hover:bg-[#1a86da] min-[680px]:col-span-1"
            href={downloadWindows}
            aria-label="Download for Windows"
          >
            <WindowsMark />
            Windows
            <span className="font-medium text-[11px] text-white/70">x64 + ARM64</span>
          </a>

          <a
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#fcc624] bg-[#fcc624] px-5 py-3 font-semibold text-[15px] text-black transition hover:-translate-y-0.5 hover:border-[#ffd34f] hover:bg-[#ffd34f]"
            href={downloadLinuxX64}
            aria-label="Download for Linux x64"
          >
            <LinuxMark size={17} />
            Linux
            <span className="font-medium text-[12px] text-black/55">x64</span>
          </a>
          <a
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#fcc624] bg-[#fcc624] px-5 py-3 font-semibold text-[15px] text-black transition hover:-translate-y-0.5 hover:border-[#ffd34f] hover:bg-[#ffd34f]"
            href={downloadLinuxArm64}
            aria-label="Download for Linux ARM64"
          >
            <LinuxMark size={17} />
            Linux
            <span className="font-medium text-[12px] text-black/55">ARM64</span>
          </a>
        </div>

        <a
          className="relative inline-flex items-center gap-2 font-medium text-[14px] text-ink-muted transition-colors hover:text-ink"
          href={repository}
          target="_blank"
          rel="noreferrer"
        >
          <GitHubMark size={16} />
          View on GitHub
          <span
            className={`absolute left-full ml-2.5 inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums ${stars === null ? 'invisible' : ''}`}
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
