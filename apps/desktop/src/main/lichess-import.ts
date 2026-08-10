import { BrowserWindow } from 'electron'
import { LICHESS_IMPORT_URL, lichessGameKey } from '../shared/lichess-review'
import { isSiteURL, SITES } from '../shared/sites'

const IMPORT_TIMEOUT = 20_000
const ABORTED_BY_USER = -3

export function submitLichessImport(pgn: string): boolean {
  const form = document.querySelector<HTMLFormElement>('form.import[action="/import"]')
  const pgnField = form?.querySelector<HTMLTextAreaElement>('textarea[name="pgn"]')
  const analysisField = form?.querySelector<HTMLInputElement>('input[name="analyse"]')
  if (!form || !pgnField) {
    return false
  }

  pgnField.value = pgn
  pgnField.dispatchEvent(new Event('input', { bubbles: true }))

  if (analysisField && !analysisField.disabled) {
    analysisField.checked = true
    analysisField.dispatchEvent(new Event('change', { bubbles: true }))
  }

  form.requestSubmit()
  return true
}

export function importGameOnLichess(pgn: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const window = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: SITES.lichess.partition,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    const contents = window.webContents
    let settled = false
    let submitted = false

    const timeout = setTimeout(() => finish(new Error('Lichess import timed out')), IMPORT_TIMEOUT)

    const finish = (error: Error | null, url?: string): void => {
      if (settled) {
        return
      }

      settled = true
      clearTimeout(timeout)

      if (!window.isDestroyed()) {
        window.destroy()
      }

      if (error || !url) {
        reject(error ?? new Error('Lichess import failed'))
      } else {
        resolve(url)
      }
    }

    const finishIfGame = (url: string): void => {
      if (submitted && lichessGameKey(url)) {
        finish(null, url)
      }
    }

    contents.setWindowOpenHandler(() => ({ action: 'deny' }))
    contents.on('will-navigate', (event, url) => {
      if (!isSiteURL('lichess', url)) {
        event.preventDefault()
        finish(new Error('Lichess import left the expected site'))
      }
    })
    contents.on('did-navigate', (_event, url) => finishIfGame(url))
    contents.on('did-navigate-in-page', (_event, url, isMainFrame) => {
      if (isMainFrame) {
        finishIfGame(url)
      }
    })
    contents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription, _validatedURL, isMainFrame) => {
        if (isMainFrame && errorCode !== ABORTED_BY_USER) {
          finish(new Error(errorDescription))
        }
      }
    )
    contents.on('dom-ready', () => {
      if (submitted || contents.getURL() !== LICHESS_IMPORT_URL) {
        return
      }

      submitted = true
      contents
        .executeJavaScript(`(${submitLichessImport.toString()})(${JSON.stringify(pgn)})`)
        .then((started) => {
          if (!started) {
            finish(new Error('Lichess import form was unavailable'))
          }
        })
        .catch((error: unknown) => {
          finish(error instanceof Error ? error : new Error('Lichess import failed'))
        })
    })
    window.on('closed', () => {
      if (!settled) {
        finish(new Error('Lichess import window closed unexpectedly'))
      }
    })

    window.loadURL(LICHESS_IMPORT_URL).catch((error: unknown) => {
      finish(error instanceof Error ? error : new Error('Lichess import failed'))
    })
  })
}
