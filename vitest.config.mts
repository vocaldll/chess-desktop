import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'apps/desktop/vitest.node.config.mts',
      'apps/desktop/vitest.renderer.config.mts',
      'apps/web/vitest.config.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['apps/*/src/**/*.{ts,tsx,svelte}'],
      exclude: ['**/*.d.ts', '**/*.test.{ts,tsx}', '**/main.ts', '**/entry-server.tsx'],
      thresholds: {
        statements: 55,
        branches: 55,
        functions: 55,
        lines: 55,
      },
    },
  },
})
