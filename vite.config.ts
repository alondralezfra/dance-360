import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Unit + integration tests live next to the code. Browser tests are in e2e/ (Playwright).
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      // Coverage is enforced on the logic layers. UI is covered by component + e2e tests.
      include: ['src/model/**', 'src/persistence/**', 'src/store/**'],
      exclude: ['**/*.test.ts', 'src/persistence/fixtures/**', 'src/**/index.ts', 'src/store/storeTypes.ts'],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 95, statements: 95, functions: 95, branches: 90 },
    },
  },
})
