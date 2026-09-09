import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { $, browser, expect } from '@wdio/globals'

describe('Close game confirmation', () => {
  it('uses the app theme, traps focus, and dismisses with Escape', async () => {
    const welcome = $('[role="dialog"][aria-label="Welcome"]')
    if (await welcome.isDisplayed()) {
      await $('.welcome .choice:first-child').click()
      await $('.card .skip').click()
    }

    await browser.electron.execute((electron) => {
      electron.BrowserWindow.getAllWindows()[0]?.webContents.send('window:close-requested')
    })

    const dialog = $('dialog[aria-labelledby="close-game-title"]')
    await expect(dialog).toBeDisplayed()
    await expect($('button=Keep playing')).toBeFocused()
    await browser.keys('Tab')
    await expect($('button=Close app')).toBeFocused()
    await browser.keys('Tab')
    await expect($('button=Keep playing')).toBeFocused()
    await browser.saveScreenshot(join(tmpdir(), 'chess-desktop-close-modal.png'))
    await browser.keys('Escape')
    await expect(dialog).not.toBeDisplayed()
    await expect($('aria/Settings')).toBeDisplayed()
  })
})
