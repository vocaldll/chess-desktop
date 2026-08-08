import {
  app,
  type BrowserWindow,
  type ContextMenuParams,
  clipboard,
  Menu,
  type MenuItemConstructorOptions,
  shell,
  type WebContents
} from 'electron'
import { isOpenableExternally } from '../shared/sites'
import { getSiteWebContents } from './webview'

function openExternally(url: string): void {
  if (!isOpenableExternally(url)) {
    return
  }

  shell.openExternal(url).catch((error) => {
    console.error('Failed to open external URL:', error)
  })
}

function buildTemplate(
  contents: WebContents,
  params: ContextMenuParams,
  currentPageURL?: string
): MenuItemConstructorOptions[] {
  const items: MenuItemConstructorOptions[] = []

  if (currentPageURL && isOpenableExternally(currentPageURL)) {
    items.push(
      { label: 'Open in browser', click: () => openExternally(currentPageURL) },
      { type: 'separator' }
    )
  }

  if (params.isEditable) {
    items.push(
      { label: 'Cut', enabled: params.editFlags.canCut, click: () => contents.cut() },
      { label: 'Copy', enabled: params.editFlags.canCopy, click: () => contents.copy() },
      { label: 'Paste', enabled: params.editFlags.canPaste, click: () => contents.paste() },
      { type: 'separator' },
      {
        label: 'Select all',
        enabled: params.editFlags.canSelectAll,
        click: () => contents.selectAll()
      }
    )
  } else if (params.selectionText.trim()) {
    items.push({ label: 'Copy', click: () => contents.copy() })
  }

  if (params.linkURL) {
    if (items.length > 0) {
      items.push({ type: 'separator' })
    }

    if (isOpenableExternally(params.linkURL)) {
      items.push({
        label: 'Open in browser',
        click: () => openExternally(params.linkURL)
      })
    }

    items.push({
      label: 'Copy link address',
      click: () => clipboard.writeText(params.linkURL)
    })
  }

  return items
}

export function registerContextMenus(getWindow: () => BrowserWindow | null): void {
  app.on('web-contents-created', (_event, contents) => {
    const type = contents.getType()

    if (type !== 'window' && type !== 'webview') {
      return
    }

    contents.on('context-menu', (_contextEvent, params) => {
      const window = getWindow()
      const currentPageURL =
        type === 'window' && params.isEditable ? getSiteWebContents()?.getURL() : undefined
      const template = buildTemplate(contents, params, currentPageURL)

      if (!window || template.length === 0) {
        return
      }

      Menu.buildFromTemplate(template).popup({ window })
    })
  })
}
