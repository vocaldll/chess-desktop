import { fireEvent, render, screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '$shared/settings'
import OnboardingTour from './OnboardingTour.svelte'
import { onboarding } from './onboarding.svelte'
import { settings } from './settings.svelte'

describe('onboarding crash-report consent', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    settings.current = { ...defaultSettings }
    onboarding.start()
  })

  it('shows the setting as checked by default and persists changes', async () => {
    const set = vi.spyOn(settings, 'set').mockResolvedValue(undefined)
    render(OnboardingTour)
    const checkbox = screen.getByRole('checkbox', { name: /send anonymous crash reports/i })

    expect(checkbox).toBeChecked()

    await fireEvent.click(checkbox)

    expect(set).toHaveBeenCalledWith('anonymousErrorReporting', false)
  })
})
