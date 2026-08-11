import type { WebContents } from 'electron'

export class InsertedCss {
  readonly #keys = new WeakMap<WebContents, string>()
  readonly #versions = new WeakMap<WebContents, number>()

  start(contents: WebContents): number {
    const version = (this.#versions.get(contents) ?? 0) + 1
    this.#versions.set(contents, version)

    const previousKey = this.#keys.get(contents)
    this.#keys.delete(contents)

    if (previousKey) {
      contents.removeInsertedCSS(previousKey).catch(() => undefined)
    }

    return version
  }

  insert(contents: WebContents, version: number, css: string): void {
    contents
      .insertCSS(css)
      .then((key) => {
        if (contents.isDestroyed()) {
          return
        }

        if (this.#versions.get(contents) !== version) {
          contents.removeInsertedCSS(key).catch(() => undefined)
          return
        }

        this.#keys.set(contents, key)
      })
      .catch(() => undefined)
  }

  replace(contents: WebContents, css: string | null): void {
    const version = this.start(contents)
    if (css) {
      this.insert(contents, version, css)
    }
  }
}
