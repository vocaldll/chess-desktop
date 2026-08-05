import type { Action } from 'svelte/action'
import { settings } from './settings.svelte'

export type AnchorId = 'switcher' | 'address' | 'settings' | 'controlStrip'

export interface OnboardingStep {
  id: string
  anchor?: AnchorId
  title: string
  body: string
}

export const STEPS: readonly OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Where do you play?',
    body: 'Pick the site you want to open on launch. You can change this at any time.'
  },
  {
    id: 'switcher',
    anchor: 'switcher',
    title: 'Switch sites anytime',
    body: 'Both sites stay signed in on their own session, and each one remembers the last page you were on.'
  },
  {
    id: 'address',
    anchor: 'address',
    title: 'Jump straight to a page',
    body: 'Type a path like /puzzles and press Enter. Addresses outside the active site are rejected instead of loaded.'
  },
  {
    id: 'settings',
    anchor: 'settings',
    title: 'Make it yours',
    body: 'Everything you can change about the app lives behind the gear.'
  }
]

class Onboarding {
  active = $state(false)
  index = $state(0)
  anchors = $state<Partial<Record<AnchorId, HTMLElement>>>({})

  get step(): OnboardingStep {
    return STEPS[this.index]
  }

  get isLast(): boolean {
    return this.index === STEPS.length - 1
  }

  get pickingSite(): boolean {
    return this.active && !this.step.anchor
  }

  start(): void {
    this.index = 0
    this.active = true
  }

  next(): void {
    if (this.isLast) {
      this.finish()
      return
    }

    this.index += 1
  }

  finish(): void {
    this.active = false
    settings.set('onboardingCompleted', true)
  }
}

export const onboarding = new Onboarding()

export const anchor: Action<HTMLElement, AnchorId> = (node, id) => {
  onboarding.anchors[id] = node

  return {
    destroy() {
      delete onboarding.anchors[id]
    }
  }
}
