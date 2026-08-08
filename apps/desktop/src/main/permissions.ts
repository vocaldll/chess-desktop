import { session } from 'electron'
import { isSiteURL, SITE_ORDER, SITES, type SiteId } from '../shared/sites'
import { getSettings } from './store'

const ALLOWED_PERMISSIONS = new Set(['clipboard-sanitized-write', 'fullscreen'])

function isAllowed(
  siteId: SiteId,
  permission: string,
  requestingUrl: string,
  isMainFrame: boolean
): boolean {
  if (!isMainFrame || !isSiteURL(siteId, requestingUrl)) {
    return false
  }

  if (permission === 'notifications') {
    return getSettings().notificationsEnabled
  }

  return ALLOWED_PERMISSIONS.has(permission)
}

export function registerPermissions(): void {
  for (const id of SITE_ORDER) {
    const siteSession = session.fromPartition(SITES[id].partition)

    siteSession.setPermissionRequestHandler((_contents, permission, callback, details) => {
      callback(isAllowed(id, permission, details.requestingUrl, details.isMainFrame))
    })

    siteSession.setPermissionCheckHandler((_contents, permission, requestingOrigin, details) =>
      isAllowed(id, permission, details.requestingUrl ?? requestingOrigin, details.isMainFrame)
    )
  }
}
