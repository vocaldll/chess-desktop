import { Expand, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const shots = [
  {
    src: '/showcase-chesscom.png',
    label: 'Chess.com',
    alt: 'Chess Desktop running Chess.com'
  },
  {
    src: '/showcase-lichess.png',
    label: 'Lichess',
    alt: 'Chess Desktop running Lichess'
  }
]

export default function Showcase() {
  const lightbox = useRef<HTMLDialogElement>(null)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [expanded, setExpanded] = useState(false)

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

    const stopExpanded = () => setExpanded(false)

    dialog.addEventListener('click', closeOnBackdrop)
    dialog.addEventListener('close', stopExpanded)
    return () => {
      dialog.removeEventListener('click', closeOnBackdrop)
      dialog.removeEventListener('close', stopExpanded)
    }
  }, [])

  useEffect(() => {
    if (paused || expanded) {
      return
    }

    const timer = setInterval(() => setActive((active + 1) % shots.length), 5000)
    return () => clearInterval(timer)
  }, [paused, expanded, active])

  return (
    <>
      <figure
        className="rise m-0 w-full min-w-0"
        style={{ animationDelay: '240ms' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <button
          type="button"
          className="group relative mx-auto block cursor-zoom-in border-0 bg-none p-0 leading-[0]"
          onClick={() => {
            setExpanded(true)
            lightbox.current?.showModal()
          }}
        >
          <span className="grid">
            {shots.map((shot, index) => (
              <img
                key={shot.src}
                className={`col-start-1 row-start-1 block h-auto max-h-[min(56dvh,560px)] w-auto max-w-full rounded-xl border border-line object-contain transition-opacity duration-500 group-hover:border-line-strong motion-reduce:transition-none ${index === active ? 'opacity-100' : 'opacity-0'}`}
                src={shot.src}
                width={1738}
                height={1087}
                alt={shot.alt}
                aria-hidden={index !== active}
              />
            ))}
          </span>

          <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-canvas/85 px-3 py-1.5 font-mono text-[11.5px] leading-snug backdrop-blur-sm transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
            <Expand size={12} aria-hidden="true" />
            View full size
          </span>
        </button>

        <figcaption className="mt-3 flex items-center justify-center gap-5 font-mono text-[12px]">
          {shots.map((shot, index) => (
            <button
              key={shot.label}
              type="button"
              aria-pressed={index === active}
              className={`cursor-pointer border-0 bg-transparent p-1 transition-colors ${index === active ? 'text-ink' : 'text-ink-muted hover:text-ink'}`}
              onClick={() => setActive(index)}
            >
              {shot.label}
            </button>
          ))}
        </figcaption>
      </figure>

      <dialog
        ref={lightbox}
        aria-label="Screenshot preview"
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
          width={1738}
          height={1087}
          alt={shots[active].alt}
        />

        <fieldset
          className="fixed bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-canvas/85 p-1 font-mono text-[12px] backdrop-blur-sm"
          aria-label="Choose screenshot"
        >
          {shots.map((shot, index) => (
            <button
              key={shot.label}
              type="button"
              aria-pressed={index === active}
              className={`cursor-pointer rounded-full px-3 py-1.5 transition-colors ${index === active ? 'bg-surface-hover text-ink' : 'bg-transparent text-ink-muted hover:text-ink'}`}
              onClick={() => setActive(index)}
            >
              {shot.label}
            </button>
          ))}
        </fieldset>

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
