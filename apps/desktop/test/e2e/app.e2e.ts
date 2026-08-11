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

    await $('aria/Settings').click()
    const settingsDialog = $('[role="dialog"][aria-label="Settings"]')
    await expect(settingsDialog).toBeDisplayed()
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
    await shortcutsDialog.$('aria/Edit reload the page shortcut 1').click()
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
