import { downloadLinux, downloadWindows, repository, site } from '../site'
import GitHubMark from './GitHubMark'
import LinuxMark from './LinuxMark'
import WindowsMark from './WindowsMark'

export default function Hero() {
  return (
    <section className="flex w-full min-w-0 flex-col items-center">
      <div className="rise flex items-center gap-2.5">
        <img
          className="block shrink-0 rounded-md"
          src="/favicon-32x32.png"
          width={28}
          height={28}
          alt=""
        />
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
      >
        <div className="flex w-full max-w-[320px] flex-col gap-3 min-[480px]:w-auto min-[480px]:max-w-none min-[480px]:flex-row">
          <a
            className="inline-flex items-center justify-center gap-2.5 rounded-full border border-[#0078d4] bg-[#0078d4] px-6 py-3 font-semibold text-[15px] text-white transition-colors hover:border-[#1a86da] hover:bg-[#1a86da]"
            href={downloadWindows}
          >
            <WindowsMark />
            Download for Windows
          </a>

          <a
            className="inline-flex items-center justify-center gap-2.5 rounded-full border border-[#fcc624] bg-[#fcc624] px-6 py-3 font-semibold text-[15px] text-black transition-colors hover:border-[#ffd23e] hover:bg-[#ffd23e]"
            href={downloadLinux}
          >
            <LinuxMark size={17} />
            Download for Linux
          </a>
        </div>

        <a
          className="inline-flex items-center gap-2 font-medium text-[14px] text-ink-muted transition-colors hover:text-ink"
          href={repository}
          target="_blank"
          rel="noreferrer"
        >
          <GitHubMark size={16} />
          View on GitHub
        </a>
      </div>
    </section>
  )
}
