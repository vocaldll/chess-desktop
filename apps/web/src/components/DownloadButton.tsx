import { Download } from 'lucide-react'
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
    <div className="relative w-full max-w-[280px]" ref={containerRef}>
      <button
        ref={triggerRef}
        className="grid w-full cursor-pointer grid-cols-[20px_1fr_20px] items-center rounded-full border border-line-strong bg-surface-2 px-5 py-3 font-semibold text-[15px] text-ink transition-colors hover:border-[#4a4a4a] hover:bg-surface-hover"
        type="button"
        aria-controls={optionsId}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((current) => !current)}
      >
        <Download
          className="justify-self-start text-brand"
          aria-hidden="true"
          size={17}
          strokeWidth={2}
        />
        <span className="min-w-0 text-center">Download Chess Desktop</span>
        <span className="justify-self-end">
          <ChevronDown open={open} />
        </span>
      </button>

      {open ? (
        <nav
          className="absolute top-full right-0 z-20 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-surface-2 p-1.5 text-left shadow-[0_18px_48px_rgba(0,0,0,0.45)]"
          id={optionsId}
          aria-label="Download options"
        >
          <p className="px-3 pt-1.5 pb-1 font-medium text-[11px] text-ink-faint uppercase tracking-[0.12em]">
            Choose a version
          </p>
          <a
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-hover"
            href={downloadWindows}
            aria-label="Download for Windows"
            onClick={() => setOpen(false)}
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#0078d4] text-white">
              <WindowsMark />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-[14px]">Windows</span>
              <span className="block text-[11px] text-ink-muted">x64 + ARM64</span>
            </span>
            <span className="font-mono text-[11px] text-ink-muted">Installer</span>
          </a>
          <a
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-hover"
            href={downloadLinuxX64}
            aria-label="Download for Linux x64"
            onClick={() => setOpen(false)}
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#fcc624] text-black">
              <LinuxMark size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-[14px]">Linux</span>
              <span className="block text-[11px] text-ink-muted">x64</span>
            </span>
            <span className="font-mono text-[11px] text-ink-muted">AppImage</span>
          </a>
          <a
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-hover"
            href={downloadLinuxArm64}
            aria-label="Download for Linux ARM64"
            onClick={() => setOpen(false)}
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#fcc624] text-black">
              <LinuxMark size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-[14px]">Linux</span>
              <span className="block text-[11px] text-ink-muted">ARM64</span>
            </span>
            <span className="font-mono text-[11px] text-ink-muted">AppImage</span>
          </a>
        </nav>
      ) : null}
    </div>
  )
}
