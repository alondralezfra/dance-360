import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// `npm run screenshots`: photographs the main screens (e2e/ui.shots.ts) so the UI can be looked at, by a person or
// by Claude (see .claude/skills/ui-styling). It reuses the end-to-end settings (the production build served by
// `vite preview`, Edge locally, Chromium with CI=1) and picks up only *.shots.ts, so `npm run test:e2e` and
// `npm run verify` never run it.
export default defineConfig({
  ...base,
  testMatch: /.*\.shots\.ts$/,
  reporter: 'list',
})
