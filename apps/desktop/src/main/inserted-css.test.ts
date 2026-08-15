import { describe, expect, it, vi } from 'vitest'
import { InsertedCss } from './inserted-css'

describe('inserted CSS controller', () => {
  it('removes stale insertions and the latest active style', async () => {
    let resolveFirst: (key: string) => void = () => undefined
    const first = new Promise<string>((resolve) => {
      resolveFirst = resolve
    })
    const contents = {
      isDestroyed: vi.fn().mockReturnValue(false),
      insertCSS: vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce('second-key'),
      removeInsertedCSS: vi.fn().mockResolvedValue(undefined),
    }
    const styles = new InsertedCss()

    styles.replace(contents as never, '.first {}')
    styles.replace(contents as never, '.second {}')
    await vi.waitFor(() => expect(contents.insertCSS).toHaveBeenCalledTimes(2))

    resolveFirst('first-key')
    await vi.waitFor(() => expect(contents.removeInsertedCSS).toHaveBeenCalledWith('first-key'))

    styles.replace(contents as never, null)
    expect(contents.removeInsertedCSS).toHaveBeenCalledWith('second-key')
  })
})
