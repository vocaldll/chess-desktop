import { shell } from 'electron'
import { isOpenableExternally } from '../shared/sites'

export function openExternalUrl(url: string): void {
  if (!isOpenableExternally(url)) {
    console.warn('Blocked external URL with unsupported protocol:', url)
    return
  }

  shell.openExternal(url).catch((error) => {
    console.error('Failed to open external URL:', error)
  })
}
