import { contact, issues, releases, repository, site } from '../site'

const links = [
  { label: 'Source', href: repository },
  { label: 'Releases', href: releases },
  { label: 'Issues', href: issues },
  { label: contact, href: `mailto:${contact}` }
]

export default function Footer() {
  return (
    <footer className="mt-auto border-line border-t">
      <div className="shell flex flex-col gap-3 pt-5 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <img
            className="block shrink-0 rounded-[5px]"
            src="/favicon-32x32.png"
            width={20}
            height={20}
            alt=""
          />
          <span className="font-mono text-[13px] text-ink-muted">{site.domain}</span>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
          {links.map(({ label, href }) => (
            <a
              key={label}
              className="text-ink-muted transition-colors hover:text-ink"
              href={href}
              target={href.startsWith('mailto:') ? undefined : '_blank'}
              rel={href.startsWith('mailto:') ? undefined : 'noreferrer'}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      <div className="shell pb-5">
        <p className="text-[12px] text-ink-muted">
          Not affiliated with Chess.com or Lichess. All trademarks belong to their owners.
        </p>
      </div>
    </footer>
  )
}
