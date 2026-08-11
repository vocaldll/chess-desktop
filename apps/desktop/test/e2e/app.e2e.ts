import { $, browser, expect } from '@wdio/globals'

interface TestSettings {
  activeSite: string
  onboardingCompleted: boolean
  shortcutOverrides: Record<
    string,
    Record<string, { key: string; control: boolean; alt: boolean; shift: boolean } | null>
  >
}

async function readSettings(): Promise<TestSettings> {
  return browser.executeAsync<TestSettings, []>((done) => {
    const api = (
      window as typeof window & {
        api: { settings: { getAll: () => Promise<TestSettings> } }
      }
    ).api

    api.settings.getAll().then((settings) => done(settings))
  })
}

describe('Chess Desktop', () => {
  it('completes onboarding and restores the selected site after a reload', async () => {
    const welcome = $('[role="dialog"][aria-label="Welcome"]')
    await expect(welcome).toBeDisplayed()
    await expect($('h2=Where do you play?')).toBeDisplayed()
    await expect($('aria/Settings')).toBeDisplayed()
    await expect($('aria/Back')).toBeDisabled()
    await expect($('.crash-consent input')).toBeSelected()

    await $('.welcome .choice:nth-child(2)').click()
    await expect($('h2=Switch sites anytime')).toBeDisplayed()
    await $('.card .skip').click()
    await welcome.waitForExist({ reverse: true })

    await browser.waitUntil(async () => {
      const settings = await readSettings()
      return settings.activeSite === 'lichess' && settings.onboardingCompleted
    })

    const address = $('aria/Address')
    await expect(address).toHaveValue('https://lichess.org/')

    await browser.electron.execute((electron) => {
      const window = electron.BrowserWindow.getAllWindows()[0]
      window?.unmaximize()
      window?.setSize(800, 600)
    })

    const titlebarLayout = await browser.execute(() => {
      const omnibox = document.querySelector<HTMLElement>('.omnibox')
      const controls = document.querySelector<HTMLElement>('.titlebar .trailing')
      if (!omnibox || !controls) {
        throw new Error('Titlebar layout not found')
      }

      return {
        controlsLeft: controls.getBoundingClientRect().left,
        omniboxRight: omnibox.getBoundingClientRect().right
      }
    })
    expect(titlebarLayout.omniboxRight).toBeLessThanOrEqual(titlebarLayout.controlsLeft)

    await $('aria/Settings').click()
    const settingsDialog = $('[role="dialog"][aria-label="Settings"]')
    await expect(settingsDialog).toBeDisplayed()
    const settingsLayout = await browser.execute(() => {
      const body = document.querySelector<HTMLElement>('.settings-body')
      const grids = Array.from(document.querySelectorAll<HTMLElement>('.settings-section-grid'))
      if (!body || grids.length === 0) {
        throw new Error('Settings layout not found')
      }

      return {
        clientHeight: body.clientHeight,
        columnCounts: grids.map(
          (grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length
        ),
        scrollHeight: body.scrollHeight
      }
    })
    expect(settingsLayout.columnCounts).toEqual([2, 2, 2])
    expect(settingsLayout.scrollHeight).toBeLessThanOrEqual(settingsLayout.clientHeight)
    await expect(settingsDialog.$('aria/Keyboard shortcuts')).toBeDisplayed()
    await expect(settingsDialog.$('.privacy-option input')).toBeSelected()
    await expect(
      settingsDialog.$(
        'aria/Beta: Discord status detection is still being tested and may sometimes be inaccurate.'
      )
    ).toHaveAttribute(
      'title',
      'Discord status detection is still being tested and may sometimes be inaccurate.'
    )

    await settingsDialog.$('aria/Keyboard shortcuts').click()
    const shortcutsDialog = $('[role="dialog"][aria-label="Keyboard shortcuts"]')
    const shortcutLayout = await browser.execute(() => {
      const body = document.querySelector<HTMLElement>('[aria-label="Keyboard shortcuts"] .body')
      if (!body) {
        throw new Error('Shortcut list not found')
      }

      const styles = getComputedStyle(body)
      return {
        hasOverflow: body.scrollHeight > body.clientHeight,
        scrollbarColor: styles.scrollbarColor,
        scrollbarWidth: styles.scrollbarWidth
      }
    })
    expect(shortcutLayout.hasOverflow).toBe(true)
    expect(shortcutLayout.scrollbarColor).not.toBe('auto')
    expect(shortcutLayout.scrollbarWidth).toBe('thin')

    await shortcutsDialog.$('aria/Edit reload the page shortcut 1').click()
    const recordingHintLayout = await browser.execute(() => {
      const hint = document.querySelector<HTMLElement>('.recording-hint')
      if (!hint) {
        throw new Error('Recording hint not found')
      }

      return {
        clientWidth: hint.clientWidth,
        scrollWidth: hint.scrollWidth,
        text: hint.textContent
      }
    })
    expect(recordingHintLayout.text).toBe('Esc cancel · Del remove')
    expect(recordingHintLayout.scrollWidth).toBeLessThanOrEqual(recordingHintLayout.clientWidth)
    await browser.keys(['Control', 'Shift', 'k'])
    await browser.waitUntil(async () => {
      const settings = await readSettings()
      return settings.shortcutOverrides.reload?.['0']?.key === 'k'
    })

    await shortcutsDialog.$('aria/Edit reload the page shortcut 2').click()
    await browser.keys(['Control', 'Shift', 'j'])
    await browser.waitUntil(async () => {
      const settings = await readSettings()
      const reload = settings.shortcutOverrides.reload
      return reload?.['0']?.key === 'k' && reload?.['1']?.key === 'j'
    })

    await settingsDialog.$('aria/Close').click()
    await settingsDialog.waitForExist({ reverse: true })

    await browser.refresh()
    await expect($('aria/Address')).toHaveValue('https://lichess.org/')
    await expect(welcome).not.toExist()
  })
})
