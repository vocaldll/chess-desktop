import {
  app,
  type BrowserWindow,
  type ContextMenuParams,
  clipboard,
  Menu,
  type MenuItemConstructorOptions,
  type WebContents
} from 'electron'

function buildTemplate(
  contents: WebContents,
  params: ContextMenuParams
): MenuItemConstructorOptions[] {
  const items: MenuItemConstructorOptions[] = []

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
      const template = buildTemplate(contents, params)

      if (!window || template.length === 0) {
        return
      }

      Menu.buildFromTemplate(template).popup({ window })
    })
  })
}
