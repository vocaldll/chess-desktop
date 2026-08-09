import { $, browser, expect } from '@wdio/globals'

interface TestSettings {
  activeSite: string
  onboardingCompleted: boolean
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
    await settingsDialog.$('aria/Close').click()
    await settingsDialog.waitForExist({ reverse: true })

    await browser.refresh()
    await expect($('aria/Address')).toHaveValue('https://lichess.org/')
    await expect(welcome).not.toExist()
  })
})
