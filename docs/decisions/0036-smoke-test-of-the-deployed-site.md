# 0036. A smoke test of the deployed site after each production deploy

- Status: Accepted
- Date: 2026-11-24
- Part of Stage 1 in [operations-and-quality.md](../operations-and-quality.md). Builds on the hosting in [0035](0035-cloudflare-hosting.md).

## Context
CI proves the code works on a build served from the runner, but nothing checked the real site: a wrong header policy, a broken domain, a missing fall-back to `index.html` or something the host adds to the page would reach people unnoticed. Decision 0035 left this as a separate slice.

## Decisions (made with the project owner)
- **When:** a `smoke-test` job in `deploy.yml` runs after the production deploy (`needs: production`). Not on a schedule, and not against pull request previews, for now.
- **What:** `smoke/deployed-site.spec.ts` opens formism.app in a fresh browser, creates a project, waits for it to save, reloads the project address (which needs the host's fall-back to `index.html`) and checks the project came back, and fails on any console error, crash, failed request or HTTP 4xx/5xx response (a blocked script from a bad Content-Security-Policy shows up as a console error and a failed request).
- **How:** its own config `playwright.smoke.config.ts` and `npm run test:smoke`, kept out of `e2e/` so `npm run test:e2e` and `verify` never touch the live site. `SMOKE_URL` points it at another address. It builds and serves nothing and needs no secrets. It allows two retries in CI only (a live network can blink; the local suites allow none).
- **If it fails:** the Deploy run goes red and GitHub emails the owner. Production is already live, so this reports rather than stops a bad version; rolling back is by hand (0035).

## Consequences
- The first run found that Cloudflare was injecting its Web Analytics script into every page, which our Content-Security-Policy blocks (a console error for every visitor). Analytics is a Stage 3 decision (operations doc), so the fix is to turn the injection off in the Cloudflare dashboard, not to widen the policy. Until it is off the smoke test fails, which is the test doing its job.
- The CSP and headers are now checked on the live site in effect, not just in the config file.
- Not covered: audio, the canvas and offline use, which need a person; and a down site is noticed only after a deploy (uptime monitoring is a separate Stage 1 item).
