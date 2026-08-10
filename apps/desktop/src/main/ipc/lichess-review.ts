import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { isReviewPgn } from '../../shared/lichess-review'
import { updatePresenceLocation } from '../discord'
import { importGameOnLichess } from '../lichess-import'
import { rememberLichessReview } from '../lichess-review-state'

export function registerLichessReviewIpc(): void {
  ipcMain.handle(IPC.reviewOnLichess.start, async (_event, pgn: unknown) => {
    if (!isReviewPgn(pgn)) {
      throw new Error('Invalid PGN')
    }

    const url = await importGameOnLichess(pgn)
    rememberLichessReview(url)
    updatePresenceLocation('lichess', url, 'reviewing')
    return url
  })
}
