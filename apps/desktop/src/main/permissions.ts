import { session } from 'electron'
import { isSiteURL, SITE_ORDER, SITES, type SiteId } from '../shared/sites'
import { getSettings } from './store'

const ALLOWED_PERMISSIONS = new Set(['clipboard-sanitized-write', 'fullscreen'])

export function isPermissionAllowed(
  siteId: SiteId,
  permission: string,
  requestingUrl: string,
  isMainFrame: boolean,
  notificationsEnabled: boolean,
): boolean {
  if (!isMainFrame || !isSiteURL(siteId, requestingUrl)) {
    return false
  }

  if (permission === 'notifications') {
    return notificationsEnabled
  }

  return ALLOWED_PERMISSIONS.has(permission)
}

export function registerPermissions(): void {
  for (const id of SITE_ORDER) {
    const siteSession = session.fromPartition(SITES[id].partition)

    siteSession.setPermissionRequestHandler((_contents, permission, callback, details) => {
      callback(
        isPermissionAllowed(
          id,
          permission,
          details.requestingUrl,
          details.isMainFrame,
          getSettings().notificationsEnabled,
        ),
      )
    })

    siteSession.setPermissionCheckHandler((_contents, permission, requestingOrigin, details) =>
      isPermissionAllowed(
        id,
        permission,
        details.requestingUrl ?? requestingOrigin,
        details.isMainFrame,
        getSettings().notificationsEnabled,
      ),
    )
  }
}
