import { Expand, X } from 'lucide-react'
import { type ComponentType, useEffect, useRef, useState } from 'react'
import ChessComMark from './ChessComMark'
import LichessMark from './LichessMark'

type Screenshot = {
  src: string
  label: string
  alt: string
  width: number
  height: number
  mark?: ComponentType<{ size?: number }>
}

type ShowcaseProps = {
  shots?: readonly [Screenshot, ...Screenshot[]]
  loading?: 'eager' | 'lazy'
}

const heroShots: readonly [Screenshot, ...Screenshot[]] = [
  {
    src: '/chesscom-home.png',
    label: 'Chess.com',
    mark: ChessComMark,
    alt: 'Chess Desktop running Chess.com',
    width: 2560,
    height: 1400,
  },
  {
    src: '/lichess-home.png',
    label: 'Lichess',
    mark: LichessMark,
    alt: 'Chess Desktop running Lichess',
    width: 2560,
    height: 1400,
  },
]

export default function Showcase({ shots = heroShots, loading = 'eager' }: ShowcaseProps) {
  const lightbox = useRef<HTMLDialogElement>(null)
  const [active, setActive] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (shots.length < 2 || expanded) return

    const timer = window.setTimeout(() => setActive((active + 1) % shots.length), 5000)
    return () => window.clearTimeout(timer)
  }, [active, shots.length, expanded])

  useEffect(() => {
    const dialog = lightbox.current

    if (!dialog) {
      return
    }

    const closeOnBackdrop = (event: MouseEvent) => {
      if (event.target === dialog) {
        dialog.close()
      }
    }

    dialog.addEventListener('click', closeOnBackdrop)
    return () => {
      dialog.removeEventListener('click', closeOnBackdrop)
    }
  }, [])

  return (
    <>
      <figure
        className="rise m-0 w-full min-w-0"
        style={{ animationDelay: '240ms' }}
        data-active-shot={shots[active].label}
      >
        <button
          type="button"
          className="showcase-trigger group relative mx-auto block cursor-zoom-in border-0 bg-none p-0 leading-[0]"
          onClick={() => {
            lightbox.current?.showModal()
            setExpanded(true)
          }}
        >
          <span className="showcase-viewport">
            <span className="showcase-track" style={{ transform: `translateX(-${active * 100}%)` }}>
              {shots.map((shot, index) => (
                <img
                  key={shot.src}
                  className="showcase-image row-start-1 block max-w-full border border-line object-contain group-hover:border-line-strong"
                  src={shot.src}
                  width={shot.width}
                  height={shot.height}
                  loading={loading}
                  alt={shot.alt}
                  aria-hidden={index !== active}
                />
              ))}
            </span>
          </span>

          <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-canvas/85 px-3 py-1.5 font-mono text-[11.5px] leading-snug backdrop-blur-sm transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
            <Expand size={12} aria-hidden="true" />
            View full size
          </span>
        </button>

        {shots.length > 1 && (
          <figcaption className="shot-selector">
            {shots.map((shot, index) => (
              <button
                key={shot.label}
                type="button"
                aria-pressed={index === active}
                onClick={() => setActive(index)}
              >
                {shot.mark && <shot.mark />}
                {shot.label}
              </button>
            ))}
          </figcaption>
        )}
      </figure>

      <dialog
        ref={lightbox}
        aria-label="Screenshot preview"
        onClose={() => setExpanded(false)}
        className="m-auto max-h-dvh max-w-full overflow-visible border-0 bg-transparent p-0 backdrop:bg-black/85 backdrop:backdrop-blur-sm md:max-h-[92dvh] md:max-w-[92vw]"
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            setActive((active - 1 + shots.length) % shots.length)
          } else if (event.key === 'ArrowRight') {
            event.preventDefault()
            setActive((active + 1) % shots.length)
          }
        }}
      >
        <img
          className="block max-h-dvh w-auto max-w-full object-contain md:max-h-[92dvh] md:max-w-[92vw] md:rounded-xl md:border md:border-line"
          src={shots[active].src}
          width={shots[active].width}
          height={shots[active].height}
          alt={shots[active].alt}
        />

        {shots.length > 1 && (
          <fieldset
            className="shot-selector fixed bottom-4 left-1/2 -translate-x-1/2"
            aria-label="Choose screenshot"
          >
            {shots.map((shot, index) => (
              <button
                key={shot.label}
                type="button"
                aria-pressed={index === active}
                onClick={() => setActive(index)}
              >
                {shot.mark && <shot.mark />}
                {shot.label}
              </button>
            ))}
          </fieldset>
        )}

        <form method="dialog">
          <button
            type="submit"
            aria-label="Close"
            className="fixed top-3.5 right-3.5 grid size-10 cursor-pointer place-items-center rounded-full border border-line bg-canvas/80 p-0 text-ink backdrop-blur-sm transition-colors hover:border-line-strong hover:bg-canvas"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </form>
      </dialog>
    </>
  )
}
