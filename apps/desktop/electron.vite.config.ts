import { readFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { resolve } from 'node:path'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'electron-vite'

const tokens = resolve(__dirname, '../../packages/tokens/src')
const packageVersion = (
  JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as { version: string }
).version
const sentryRelease = `chess-desktop@${packageVersion}`
const uploadSourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
)

function sourceMapPlugins(outputDirectory: 'main' | 'renderer') {
  if (!uploadSourceMaps) {
    return []
  }

  return sentryVitePlugin({
    authToken: process.env.SENTRY_AUTH_TOKEN,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    telemetry: false,
    release: {
      name: sentryRelease,
      setCommits: { auto: true, ignoreMissing: true },
    },
    sourcemaps: {
      assets: `./out/${outputDirectory}/**/*.{js,map}`,
      filesToDeleteAfterUpload: `./out/${outputDirectory}/**/*.map`,
    },
  })
}

const nodeExternals = [
  'electron',
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]

export default defineConfig({
  main: {
    resolve: {
      alias: { '@chess-desktop/tokens': tokens },
    },
    plugins: sourceMapPlugins('main'),
    build: {
      sourcemap: uploadSourceMaps ? 'hidden' : false,
      rollupOptions: {
        input: resolve(__dirname, 'src/main/index.ts'),
        external: nodeExternals,
        output: { format: 'cjs', entryFileNames: '[name].js' },
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          webview: resolve(__dirname, 'src/preload/webview.ts'),
        },
        external: nodeExternals,
        output: { format: 'cjs', entryFileNames: '[name].js' },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@chess-desktop/tokens': tokens,
        $lib: resolve(__dirname, 'src/renderer/lib'),
        $shared: resolve(__dirname, 'src/shared'),
      },
    },
    plugins: [
      svelte({ configFile: resolve(__dirname, 'svelte.config.mjs') }),
      ...sourceMapPlugins('renderer'),
    ],
    build: {
      sourcemap: uploadSourceMaps ? 'hidden' : false,
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
})
