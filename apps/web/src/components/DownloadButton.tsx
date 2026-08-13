import { useEffect, useId, useRef, useState } from 'react'
import { downloadLinuxArm64, downloadLinuxX64, downloadWindows } from '../site'
import LinuxMark from './LinuxMark'
import WindowsMark from './WindowsMark'

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="m4 6 4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function DownloadButton() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionsId = useId()

  useEffect(() => {
    if (!open) return

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div className="relative w-full max-w-[300px]" ref={containerRef}>
      <div className="flex overflow-hidden rounded-full border border-[#0078d4] bg-[#0078d4] text-white transition-colors hover:border-[#1a86da] hover:bg-[#1a86da]">
        <a
          className="inline-flex min-w-0 flex-1 items-center justify-center gap-2.5 px-6 py-3 font-semibold text-[15px] focus-visible:z-10"
          href={downloadWindows}
          aria-label="Download for Windows"
        >
          <WindowsMark />
          Windows
          <span className="font-medium text-[11px] text-white/70">x64 + ARM64</span>
        </a>
        <span className="my-2 w-px bg-white/25" aria-hidden="true" />
        <button
          ref={triggerRef}
          className="inline-flex w-12 shrink-0 cursor-pointer items-center justify-center rounded-r-full transition-colors hover:bg-white/10 focus-visible:z-10"
          type="button"
          aria-label="Other download options"
          aria-controls={optionsId}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronDown open={open} />
        </button>
      </div>

      {open ? (
        <nav
          className="absolute top-full right-0 z-20 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-surface-2 p-1.5 text-left shadow-[0_18px_48px_rgba(0,0,0,0.45)]"
          id={optionsId}
          aria-label="Other download options"
        >
          <p className="px-3 pt-1.5 pb-1 font-medium text-[11px] text-ink-faint uppercase tracking-[0.12em]">
            Linux AppImage
          </p>
          <a
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-hover"
            href={downloadLinuxX64}
            aria-label="Download for Linux x64"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#fcc624] text-black">
              <LinuxMark size={16} />
            </span>
            <span className="min-w-0 flex-1 font-semibold text-[14px]">Linux</span>
            <span className="font-mono text-[11px] text-ink-muted">x64</span>
          </a>
          <a
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-hover"
            href={downloadLinuxArm64}
            aria-label="Download for Linux ARM64"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#fcc624] text-black">
              <LinuxMark size={16} />
            </span>
            <span className="min-w-0 flex-1 font-semibold text-[14px]">Linux</span>
            <span className="font-mono text-[11px] text-ink-muted">ARM64</span>
          </a>
        </nav>
      ) : null}
    </div>
  )
}
