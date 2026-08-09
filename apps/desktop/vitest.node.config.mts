import { resolve } from 'node:path'
import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: {
    alias: {
      '@chess-desktop/tokens': resolve(import.meta.dirname, '../../packages/tokens/src/index.ts'),
      $shared: resolve(import.meta.dirname, 'src/shared')
    }
  },
  test: {
    name: 'desktop-node',
    environment: 'node',
    include: ['src/{main,shared}/**/*.test.ts', 'src/preload/{audio,index}.test.ts']
  }
})
