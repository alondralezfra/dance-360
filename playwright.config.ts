import { defineConfig } from '@playwright/test'

// End-to-end tests drive the real app in a real browser (see docs/testing.md).
// Locally they use the Microsoft Edge that ships with Windows; in CI, set CI=1
// and run `npx playwright install chromium` first.
const PORT = 5199

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true, // each test gets its own browser context (and its own localStorage)
  forbidOnly: !!process.env.CI,
  retries: 0, // a flaky test is a bug to fix, not to retry
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.CI ? undefined : 'msedge',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
