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
    <div
      className={`download-picker relative w-full max-w-[280px] ${open ? 'is-open' : ''}`}
      ref={containerRef}
    >
      <button
        ref={triggerRef}
        className="download-trigger grid w-full cursor-pointer grid-cols-[20px_1fr_20px] items-center border px-5 py-3 font-semibold text-[15px] transition-colors"
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
          className="download-menu absolute inset-x-0 top-[calc(100%-1px)] z-20 overflow-hidden p-2 text-left"
          id={optionsId}
          aria-label="Download options"
        >
          <div className="download-menu-heading" aria-hidden="true">
            <span>Choose a version</span>
            <span />
          </div>
          <a
            className="download-option"
            href={downloadWindows}
            aria-label="Download for Windows"
            onClick={() => setOpen(false)}
          >
            <span className="download-option-icon">
              <WindowsMark />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-[14px]">Windows</span>
              <span className="download-option-detail">x64 + ARM64</span>
            </span>
            <span className="download-format">Installer</span>
          </a>
          <a
            className="download-option"
            href={downloadLinuxX64}
            aria-label="Download for Linux x64"
            onClick={() => setOpen(false)}
          >
            <span className="download-option-icon">
              <LinuxMark size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-[14px]">Linux</span>
              <span className="download-option-detail">x64</span>
            </span>
            <span className="download-format">AppImage</span>
          </a>
          <a
            className="download-option"
            href={downloadLinuxArm64}
            aria-label="Download for Linux ARM64"
            onClick={() => setOpen(false)}
          >
            <span className="download-option-icon">
              <LinuxMark size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-[14px]">Linux</span>
              <span className="download-option-detail">ARM64</span>
            </span>
            <span className="download-format">AppImage</span>
          </a>
        </nav>
      ) : null}
    </div>
  )
}
