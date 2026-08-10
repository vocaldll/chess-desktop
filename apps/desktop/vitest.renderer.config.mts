import { resolve } from 'node:path'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: {
    conditions: ['browser'],
    alias: {
      '@chess-desktop/tokens': resolve(import.meta.dirname, '../../packages/tokens/src/index.ts'),
      '@chess-desktop/tokens/tokens.css': resolve(
        import.meta.dirname,
        '../../packages/tokens/src/tokens.css'
      ),
      $lib: resolve(import.meta.dirname, 'src/renderer/lib'),
      $shared: resolve(import.meta.dirname, 'src/shared')
    }
  },
  plugins: [svelte({ configFile: resolve(import.meta.dirname, 'svelte.config.mjs') })],
  test: {
    name: 'desktop-renderer',
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    include: ['src/renderer/**/*.test.ts', 'src/preload/{numbered-arrows,webview}.test.ts']
  }
})
