import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => true,
    }) as MediaQueryList,
})

HTMLDialogElement.prototype.showModal = function showModal(): void {
  this.setAttribute('open', '')
}

HTMLDialogElement.prototype.close = function close(): void {
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
}
