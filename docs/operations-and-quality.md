# Operations and quality: the standing checklist

What it takes to run Dance 360 well, beyond features: delivery, safety, privacy, reliability, accessibility. It is a **checklist with triggers**, not a to-do list: most items only become real when something specific is built (a server, accounts, an AI feature), so each one says *when* it applies. Review it at the start of every change (step 1 of the loop in [../CLAUDE.md](../CLAUDE.md)) and again before each stage below begins; update the status in the same change that moves an item.

Related: [architecture.md](architecture.md) (rules), [testing.md](testing.md) (how we verify), [decisions/0015](decisions/0015-cloud-storage-and-sync.md) (accounts and sync design), plan §10 (the only AI idea so far).

## Where the app is today

A front-end only app: no server, no accounts, no deployment. Data lives in the browser (localStorage for projects, IndexedDB for songs). CI runs `npm run verify` on every pull request and on `main`. Nothing is deployed and nobody outside the repository can use it yet. The next product slice is tap-to-snap placement and timeline markers (finishing build-order step 3).

## Stages

Work is grouped by what must be true before the next audience can use the app. Each stage is a few small branches, not one big one.

| Stage | Audience | Starts when | What it adds |
|---|---|---|---|
| **0. Code quality** (always on) | Developers | Now | Everything under "Now" below that needs no hosting. |
| **1. Hosted beta** | A few directors on a preview/staging URL | Step 3 (tap-to-snap) is done | Hosting + SSL, error tracking, export/import backup, a short privacy note, accessibility and slow-network checks, smoke test of the deployed site. |
| **2. Accounts and sync** | Directors across devices | The sync design in 0015 is started | Supabase, auth, backups and restore tests, rate limits, email, legal pages, delete-account, secrets and key rotation. |
| **3. Public launch / AI features** | Anyone | Stage 2 works and a launch date exists | Custom domain, analytics + consent, SEO and social images, uptime and alerting, and (only if plan §10 idea 4 is built) the AI items. |

## Status legend

**Done** · **Now** (do it in stage 0 or the stage it is listed under) · **Stage N** (do it when that stage starts) · **When X** (only if X is built) · **N/A** (decided it does not apply; say why).

## Checklist

### Delivery and testing
| Item | Status | Notes |
|---|---|---|
| CI on every pull request and push to `main` | **Done** | `.github/workflows/ci.yml` runs `npm run verify` on Ubuntu with Playwright's Chromium. Protect `main` and require **CI / verify** (a setting on GitHub, owned by the project owner). |
| Unit, component, architecture, e2e, regression tests | **Done** | See [testing.md](testing.md). Bug fixes start with a failing test. |
| Make new tests CI-proof before pushing | **Done** (a habit, documented) | Stress changed e2e specs with `CI=1 ... --repeat-each=3 --workers=6`, wait before measuring, leave margin on numeric layout limits (three CI failures on the playback branch came from skipping this). Now a step in testing.md. |
| Dependency audit and automatic update PRs | **Now** | Add `npm audit --omit=dev` (fail on high/critical) to CI and Dependabot (npm + GitHub Actions). Today there is neither. |
| Secret scanning and keeping secrets out of the repo | **Now** (cheap) / **Stage 2** (real) | No secrets exist today. Add secret scanning (GitHub push protection, or gitleaks in CI) now so the habit is in place; `.env*` stays ignored, and only the Supabase *anon* key ever reaches the browser. |
| Continuous deployment to a preview URL on each PR, and to staging on merge | **Stage 1** | Static hosting is enough (the app is a static build). Production only deploys from `main` after CI is green. |
| Staging environment | **Stage 1** (a preview URL) / **Stage 2** (a separate staging Supabase project) | Never test against production data. |
| Smoke test of the deployed site | **Stage 1** | A tiny Playwright run against the real URL after each deploy: loads, creates a project, reloads, still there, no console errors. Fails the deploy. |
| Rollback plan for a bad deploy | **Stage 1** | Static hosting keeps old builds: rolling back = re-promoting the previous one. Write the steps in this doc once the host is chosen. Database changes (stage 2) must be backward compatible for one release so a rollback is safe. |
| Testing on multiple devices | **Stage 1** | Playwright device profiles (phone, tablet) in CI, plus a hands-on pass on a real iPhone/iPad and an Android phone before each beta release (Safari behaves differently: audio, storage eviction, 100vh). |
| Testing on slow networks and offline | **Stage 1** | Throttled-network e2e run against the production build (first load, then a reload). The app should keep working offline once loaded: evaluate a service worker (PWA) for offline use in rehearsal rooms, as the plan wants. |
| Performance budget | **Now** (measure) / **Stage 1** (enforce) | The build is one 867 kB JavaScript file (CI already warns above 500 kB). Code-split the heavy parts (the tempo estimator, Konva) and set a size budget that fails the build. |

### Security
| Item | Status | Notes |
|---|---|---|
| No `innerHTML`/eval, strict Content-Security-Policy, security headers | **Stage 1** | Add a CSP and the usual headers at the host. React escapes by default; keep it that way (imported project files are untrusted input: validate them, never trust their shape). |
| Auth on every endpoint, row-level security | **Stage 2** | Supabase row-level security is the enforcement point, not the UI. Tests that prove user A cannot read or write user B's project (see 0015's membership roles). |
| Rate limiting | **Stage 2** | Sign-in, password reset, email-sending and any function endpoint. Supabase provides auth limits; add limits on anything we write ourselves. |
| Rotating leaked keys | **Stage 2** | A short runbook: where each key lives, how to revoke it, how to redeploy. Rehearse it once. |
| Dependency and supply-chain hygiene | **Now** | Pin via the lockfile; review Dependabot PRs; no install scripts we did not choose. |

### Reliability and recovery
| Item | Status | Notes |
|---|---|---|
| Error screens for crashes, 404, empty and loading states | **Now** | There is a not-found page and a "project does not exist" screen, and some empty states. There is **no error boundary**: a crash today shows a blank page. Add one (with "your work is saved, reload", and a way to export), and audit every screen for empty, loading and error states. |
| Protect users' work in the browser | **Now** | Browser storage can be cleared (Safari evicts it). Add **export a project to a file** and **import**, and ask the browser for persistent storage. This is also the first "backup". |
| Let people delete their data | **Now** (local) / **Stage 2** (account) | Deleting a project already removes its song file. Add "delete everything on this device"; with accounts, delete-account removes the cloud copy too. |
| Backups of the database and **tested** restores | **Stage 2** | Daily backups plus point-in-time recovery for Supabase, and a restore drill into staging on a schedule (a backup that was never restored is not a backup). Tombstones in 0015 mean deletes can propagate; backups are the undo for mistakes. |
| Logging and error tracking | **Stage 1** | Browser error tracking (Sentry or similar) with source maps, project/roster content scrubbed (it is personal data), and release tags. Console noise is already a failing test in e2e. |
| Uptime monitoring and alerting | **Stage 1** (static site) / **Stage 2** (API) | An external check on the site and, later, the backend; alerts go to someone who will see them. |
| Performance monitoring (real users) | **Stage 3** | Web Vitals sent with the error tracker; budget alerts. |

### Product and trust
| Item | Status | Notes |
|---|---|---|
| Accessibility | **Now** | Roles and accessible names are already tested. Add automated axe checks to the e2e run for each screen, keyboard-only flows, visible focus, contrast in both themes, reduced motion (playback animation), and a screen-reader pass on the timeline and stage (canvas content is not in the DOM, so it needs text alternatives). |
| Privacy note, then privacy policy and terms | **Stage 1** (a plain note: what is stored, where) / **Stage 2** (policy + terms) | A cast roster is personal data and may be about minors, so be conservative: data stays on the device until the person opts into sync (0015), and say so. |
| Cookie consent | **Stage 3 / When X** | Only needed if we add analytics or marketing cookies. Today we set none (only localStorage for the app's own data, which does not need consent). Prefer analytics that need no consent and no personal data. |
| Analytics | **Stage 3** | Decide what question each metric answers; no roster, song or project content ever leaves the device; opt-out honoured. |
| Favicon, social (OG) image, page title and description | **Stage 1** | A favicon exists; add the description, theme color, app icons and a social image. |
| SEO / AEO (search and answer-engine visibility) | **Stage 3** | The app itself is behind the editor and need not be indexed; a small marketing/landing page is what search and answer engines see. Validate: titles, descriptions, headings, structured data, sitemap, fast load, and a clear plain-text description of what the product is. N/A for the editor screens. |
| Optimizing images, caching | **Stage 1** | Hashed asset filenames with long cache lifetimes, short or no cache for `index.html`, compressed images and fonts. (The app has few images today.) |
| Custom domain, SSL, email authentication (SPF, DKIM, DMARC) | **Stage 2 / 3** | A domain when there is a public face; email authentication before the first transactional email (verification, password reset), or mail goes to spam. |
| README that explains how everything works | **Now** | The README is a start; add: architecture overview with a diagram, how to run/test/deploy, where data lives, and the runbooks above. Docs stay current per change already. |

### Accounts (only when accounts are built, stage 2)
Password reset and email verification must be tested end to end (including expired and reused links); sessions expire and sign out everywhere; two accounts on one device must not mix projects (0015); account deletion removes cloud data, audio files and backups within a stated time; sign-in errors do not reveal whether an email exists.

### AI features (only if plan §10 idea 4, "sketch or describe a shape", or any model feature is built)
Today the "smart" ideas are ordinary algorithms (assignment, snapping, conflicts) and need none of this. If a model is added: **evals** (a fixed set of inputs with expected outputs, run in CI); **prompt-injection tests** (uploaded files and project text are untrusted: the model has no tools that can change data without the director's confirmation); a **fallback** when the model API is down or slow (the feature is hidden or degraded, never blocking); **token and context limits** handled explicitly (truncate or refuse with a clear message); cost caps and rate limits per user; and opt-in with a clear statement of what leaves the device (plan §10 rules).

## Per-change review (add these to your thinking at step 1 and step 9)

1. Does this change what is stored, sent, or shown to someone else? If so: privacy, validation of untrusted input, and the delete/export story.
2. Can it fail visibly? Is there an error, empty and loading state, and is the person's work safe?
3. Does it add a dependency, a secret, or an endpoint? Audit it, keep the secret out of the repo, protect and rate-limit the endpoint.
4. Is it fast on a slow phone and a slow network? Did the bundle grow?
5. Can a keyboard-only or screen-reader user do it?
6. Does a test that depends on timing, fonts or load survive a slower Linux machine?
7. How would we roll it back?

## Suggested order of the first slices after tap-to-snap

1. **Safety net** (stage 0): error boundary, export/import a project, request persistent storage, dependency audit + Dependabot + secret scanning, axe checks in e2e.
2. **Ready to share** (stage 1): bundle splitting and a size budget, security headers and CSP, hosting with preview URLs, smoke test, error tracking, privacy note, favicon/description/social image.
3. Then product step 4 (resources and notes), step 5 (problem checks), and the sync slices in 0015, reviewing this checklist before each.
