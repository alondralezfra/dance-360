import { defineConfig } from '@playwright/test'

// The smoke test of the DEPLOYED site (decision 0036): `npm run test:smoke`. It does not build or serve
// anything; it opens the real address (formism.app unless SMOKE_URL says otherwise) and checks the
// basics still work. The deploy workflow runs it after each production deploy.
export default defineConfig({
  testDir: 'smoke',
  // A live network can blink, and a deploy can take a moment to spread: two retries in CI only. (The
  // local end-to-end tests allow none: there a flaky test is a bug.)
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.SMOKE_URL ?? 'https://formism.app',
    channel: process.env.CI ? undefined : 'msedge',
    trace: 'retain-on-failure',
  },
})
