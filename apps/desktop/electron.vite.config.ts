import { builtinModules } from 'node:module'
import { resolve } from 'node:path'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'electron-vite'

const tokens = resolve(__dirname, '../../packages/tokens/src')

const nodeExternals = [
  'electron',
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`)
]

export default defineConfig({
  main: {
    resolve: {
      alias: { '@chess-desktop/tokens': tokens }
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/main/index.ts'),
        external: nodeExternals,
        output: { format: 'cjs', entryFileNames: '[name].js' }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          webview: resolve(__dirname, 'src/preload/webview.ts')
        },
        external: nodeExternals,
        output: { format: 'cjs', entryFileNames: '[name].js' }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@chess-desktop/tokens': tokens,
        $lib: resolve(__dirname, 'src/renderer/lib'),
        $shared: resolve(__dirname, 'src/shared')
      }
    },
    plugins: [svelte({ configFile: resolve(__dirname, 'svelte.config.mjs') })],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html')
      }
    }
  }
})
