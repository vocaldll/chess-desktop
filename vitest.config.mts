import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'apps/desktop/vitest.node.config.mts',
      'apps/desktop/vitest.renderer.config.mts',
      'apps/web/vitest.config.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['apps/*/src/**/*.{ts,tsx,svelte}'],
      exclude: ['**/*.d.ts', '**/*.test.{ts,tsx}', '**/main.ts', '**/entry-server.tsx'],
      thresholds: {
        statements: 30,
        branches: 30,
        functions: 30,
        lines: 30
      }
    }
  }
})
