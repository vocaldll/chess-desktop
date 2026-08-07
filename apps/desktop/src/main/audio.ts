import type { WebContents } from 'electron'
import { isVolumePercent } from '../shared/volume'

export function applyVolume(contents: WebContents | null, percent: unknown): void {
  if (!contents || !isVolumePercent(percent)) {
    return
  }

  contents.executeJavaScript(`window.__chessDesktopVolume?.(${percent})`).catch(() => null)
}
