import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineProject } from 'vitest/config'

export default defineProject({
  root: resolve(import.meta.dirname),
  plugins: [react()],
  test: {
    name: 'web',
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}']
  }
})
