import { Expand, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

const alt =
  'Chess Desktop showing Chess.com in the front window and Lichess in the window behind it'

export default function Showcase() {
  const lightbox = useRef<HTMLDialogElement>(null)

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
    return () => dialog.removeEventListener('click', closeOnBackdrop)
  }, [])

  return (
    <>
      <figure className="m-0 min-h-0 min-w-0">
        <button
          type="button"
          className="group relative block w-full cursor-zoom-in border-0 bg-none p-0 leading-[0] wide:max-h-full"
          onClick={() => lightbox.current?.showModal()}
        >
          <img
            className="block h-auto w-full rounded-xl border border-line object-contain shadow-[0_28px_70px_rgba(0,0,0,0.6)] transition-colors group-hover:border-line-strong wide:max-h-full"
            src="/showcase.png"
            width={1920}
            height={1050}
            alt={alt}
          />

          <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-canvas/85 px-3 py-1.5 font-mono text-[11.5px] leading-snug backdrop-blur-sm transition-opacity wide:opacity-0 wide:group-hover:opacity-100 wide:group-focus-visible:opacity-100">
            <Expand size={12} aria-hidden="true" />
            View full size
          </span>
        </button>
      </figure>

      <dialog
        ref={lightbox}
        className="m-auto max-h-dvh max-w-full overflow-visible border-0 bg-transparent p-0 backdrop:bg-black/85 backdrop:backdrop-blur-sm wide:max-h-[92dvh] wide:max-w-[92vw]"
      >
        <img
          className="block max-h-dvh w-auto max-w-full object-contain wide:max-h-[92dvh] wide:max-w-[92vw] wide:rounded-xl wide:border wide:border-line"
          src="/showcase.png"
          width={1920}
          height={1050}
          alt={alt}
        />

        <form method="dialog">
          <button
            type="submit"
            aria-label="Close"
            className="fixed top-3.5 right-3.5 grid size-10 cursor-pointer place-items-center rounded-full border border-line bg-canvas/80 p-0 text-ink backdrop-blur-sm transition-colors hover:border-line-strong hover:bg-canvas wide:absolute wide:top-3 wide:right-3 wide:size-9"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </form>
      </dialog>
    </>
  )
}
