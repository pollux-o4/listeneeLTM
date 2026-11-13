import { defineConfig } from 'vitest/config'

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'jsdom',
    include: ['scripts/**/*.test.tsx'],
    setupFiles: ['./scripts/setup.ts'],
    testTimeout: 15000,
  },
})
