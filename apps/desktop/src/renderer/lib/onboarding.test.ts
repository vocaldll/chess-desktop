import { beforeEach, describe, expect, it, vi } from 'vitest'

async function freshOnboarding() {
  vi.resetModules()
  const settings = (await import('./settings.svelte')).settings
  return { ...(await import('./onboarding.svelte')), settings }
}

describe('onboarding store', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('moves through every step and persists completion', async () => {
    const { onboarding, settings, STEPS } = await freshOnboarding()
    const set = vi.spyOn(settings, 'set').mockResolvedValue(undefined)

    onboarding.start()
    expect(onboarding.active).toBe(true)
    expect(onboarding.pickingSite).toBe(true)

    for (let index = 1; index < STEPS.length; index += 1) {
      onboarding.next()
      expect(onboarding.index).toBe(index)
    }
    expect(onboarding.isLast).toBe(true)

    onboarding.next()
    expect(onboarding.active).toBe(false)
    expect(set).toHaveBeenCalledWith('onboardingCompleted', true)
  })

  it('registers and removes anchor elements', async () => {
    const { anchor, onboarding } = await freshOnboarding()
    const node = document.createElement('button')

    const action = anchor(node, 'settings')
    expect(onboarding.anchors.settings).toBe(node)

    action?.destroy?.()
    expect(onboarding.anchors.settings).toBeUndefined()
  })
})
