import { session } from 'electron'
import { SITE_ORDER, SITES } from '../shared/sites'
import { getSettings } from './store'

function isAllowed(permission: string): boolean {
  if (permission === 'notifications') {
    return getSettings().notificationsEnabled
  }

  return true
}

export function registerPermissions(): void {
  for (const id of SITE_ORDER) {
    const siteSession = session.fromPartition(SITES[id].partition)

    siteSession.setPermissionRequestHandler((_contents, permission, callback) => {
      callback(isAllowed(permission))
    })

    siteSession.setPermissionCheckHandler((_contents, permission) => isAllowed(permission))
  }
}
