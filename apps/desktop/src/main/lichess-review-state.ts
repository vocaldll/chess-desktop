import { lichessGameKey } from '../shared/lichess-review'

let reviewGame = ''
let reviewActive = false

export function rememberLichessReview(url: string): void {
  reviewGame = lichessGameKey(url) ?? ''
  reviewActive = false
}

export function isLichessReview(url: string): boolean {
  const game = lichessGameKey(url)

  if (game && game === reviewGame) {
    reviewActive = true
    return true
  }

  if (game || reviewActive) {
    reviewGame = ''
    reviewActive = false
  }

  return false
}
