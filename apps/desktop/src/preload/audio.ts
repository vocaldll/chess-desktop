import { webFrame } from 'electron'

const MASTER_GAIN = `
(() => {
  if (window.__chessDesktopVolume) {
    return
  }

  let master = 1

  const gains = new Set()
  const intents = new WeakMap()
  const tracked = new Set()

  const NativeContext = window.AudioContext || window.webkitAudioContext

  if (NativeContext) {
    const base = window.BaseAudioContext
      ? window.BaseAudioContext.prototype
      : Object.getPrototypeOf(NativeContext.prototype)
    const nativeDestination = Object.getOwnPropertyDescriptor(base, 'destination').get

    class ManagedContext extends NativeContext {
      constructor(...args) {
        super(...args)

        const gain = this.createGain()
        gain.gain.value = master
        gain.connect(nativeDestination.call(this))
        gains.add(gain)

        Object.defineProperty(this, 'destination', {
          configurable: true,
          get: () => gain
        })
      }
    }

    window.AudioContext = ManagedContext
    window.webkitAudioContext = ManagedContext
  }

  const nativeVolume = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume')

  const track = (media) => {
    if (intents.has(media)) {
      return
    }

    intents.set(media, nativeVolume.get.call(media))
    tracked.add(new WeakRef(media))
  }

  const rescale = (media) => {
    nativeVolume.set.call(media, intents.get(media) * master)
  }

  Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
    configurable: true,
    get() {
      return intents.has(this) ? intents.get(this) : nativeVolume.get.call(this)
    },
    set(value) {
      track(this)
      intents.set(this, value)
      nativeVolume.set.call(this, value * master)
    }
  })

  const nativePlay = HTMLMediaElement.prototype.play

  HTMLMediaElement.prototype.play = function (...args) {
    track(this)
    rescale(this)
    return nativePlay.apply(this, args)
  }

  window.__chessDesktopVolume = (percent) => {
    master = percent / 100

    for (const gain of gains) {
      gain.gain.value = master
    }

    for (const ref of tracked) {
      const media = ref.deref()

      if (media) {
        rescale(media)
      } else {
        tracked.delete(ref)
      }
    }

    for (const media of document.querySelectorAll('audio, video')) {
      track(media)
      rescale(media)
    }
  }
})()
`

export function installMasterGain(): void {
  webFrame.executeJavaScript(MASTER_GAIN).catch(() => null)
}
