import { defineConfig } from '@playwright/test'

// End-to-end tests drive the real app in a real browser (see docs/testing.md).
// Locally they use the Microsoft Edge that ships with Windows; in CI, set CI=1
// and run `npx playwright install chromium` first.
//
// They run against the PRODUCTION BUILD (built fresh, then served with
// `vite preview`), not the dev server: it is what actually ships, and it is much
// faster and steadier. The dev server makes every fresh browser tab fetch
// hundreds of separate modules, which got slow enough under parallel load to
// push tests past their timeout.
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
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Always start fresh, so a leftover server can never serve an out-of-date build.
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
