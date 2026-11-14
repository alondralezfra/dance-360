# Testing & verification

**A change is not implemented until `npm run verify` passes completely.** No exceptions, and no weakening, skipping or deleting a test to get green (a test may be removed only when the behaviour it covers is deliberately removed, and the change log says so).

## The commands

| Command | Use |
|---|---|
| `npm run verify` | Everything below, in order. Required before a change counts as done. |
| `npm run verify:quick` | Same minus the browser tests. For iterating only. |
| `npm test` / `npm run test:watch` | Unit + component tests. |
| `npm run test:coverage` | Same, enforcing coverage thresholds. |
| `npm run test:e2e` | Browser tests (Playwright). Builds the app and serves the production build itself (port 5199). |
| `npm run doctor` | Checks this machine can run the project: Node version, installed packages, the git hook, a browser for e2e, a free port 5199. Reports only; never changes anything. |
| `npm run check:health` | Unused code (`knip`) and duplicated code or docs (`jscpd`). Also the "Repo health" step of `verify`. |

`verify` runs, stopping at the first failure: **change discipline** -> **lint** -> **repo health** -> **unit/integration + coverage** -> **type-check + build** -> **end-to-end**.

## The layers

| Layer | Where | Covers | Environment |
|---|---|---|---|
| Unit | `src/model/*.test.ts` | Pure logic: playback maths, tempo, ordering. Fast, exhaustive. | node |
| Integration | `src/store`, `src/persistence` tests | Stores, autosave timing, repository, migrations, error paths. | jsdom |
| Component | `src/**/*.test.tsx` | A screen or control against the real stores: what the user sees and can do. | jsdom + Testing Library |
| Architecture | `src/architecture.test.ts` | The rules in [architecture.md](architecture.md). | node |
| Repo health | `src/repoHealth.test.ts`, `npm run check:health` | File sizes (400 lines app code, 900 tests), docs that name files that do not exist, unused code, copy-pasted code and docs. Rule 11 in [architecture.md](architecture.md); decision 0024. | node |
| Data fixtures | `src/persistence/fixtures*` | Every saved-data version still loads. | node |
| End-to-end | `e2e/*.spec.ts` | Real flows in a real browser, including dragging dots, reloads, themes, phone layout. | Edge (local) / Chromium (CI) |
| Accessibility | `e2e/accessibility.spec.ts`, `src/theme/contrast.test.ts` | An axe scan (WCAG 2.1 A/AA) of every screen and open state in both themes at desktop and phone width, where any violation fails; and the contrast of every text/background colour pair the app uses. Decision 0023. | Edge/Chromium; node |

Coverage thresholds (lines/statements/functions 95%, branches 90%) apply to `model/`, `persistence/` and `store/`. Code that uses IndexedDB is unit-tested against `fake-indexeddb` (in a test file that runs in the Node environment: jsdom's `Blob` can't be copied by the fake database, though real browsers can); the real browser is covered by `e2e/song.spec.ts` and `e2e/tempo-estimate.spec.ts`, which generate real WAV files so the actual audio decoder runs. Playback is checked in the real browser with real audio (`e2e/playback.spec.ts`, including counting the metronome's clicks through the browser's own audio engine), and in unit tests with a stand-in player and metronome. Backups are checked in the real browser too (`e2e/backup.spec.ts`: a real export download read back, an import round trip, and a deliberately damaged project crashing into the error screen). Tap-to-snap, marker dragging and the speaker-delay setting are checked in the real browser too (`e2e/tap-to-snap.spec.ts`: real taps while real audio plays, marker drags on the canvas); the delay maths (`model/calibration.ts`) is checked against taps made with a known delay, and the flow against stand-in players; whether a real Bluetooth speaker measures right has not been tried. Tempo estimation is checked against made-up beat tracks with a known answer (`src/test/syntheticAudio.ts`, shared by unit and browser tests); it has not been checked against real recorded music. UI is covered by component and e2e tests rather than a percentage. Never lower a threshold to pass; add tests.

## Change discipline (`scripts/check-changes.mjs`)

If anything under `src/` (non-test) changed, the same change must also touch: a test file (or `e2e/`), `CHANGELOG.md`, and something in `docs/` (or the root `README.md`). It runs inside `verify`, on every commit (pre-commit hook), and when Claude finishes a turn (Stop hook). It checks that the files were touched; reviewing that they are *right* is part of the workflow in `CLAUDE.md`.

## Continuous integration

`.github/workflows/ci.yml` runs the same `npm run verify` on GitHub for every push to `main` and every pull request (Ubuntu, Node 24, Playwright's Chromium). On pull requests it first runs `node scripts/check-changes.mjs --base origin/<base branch>`, because CI sees committed work rather than uncommitted work. Failed runs upload Playwright traces. Treat a red CI run exactly like a failing local `verify`: the change is not done. `.github/workflows/security.yml` is a second, separate workflow: an `npm audit` (blocks a pull request on a high or critical advisory in a library that ships in the app; only warns for build and test tools) and a `gitleaks` secret scan of the full history. It runs on every PR, on `main` and every Monday, and `npm run check:deps` runs the blocking audit locally. `.github/dependabot.yml` opens weekly update PRs. `src/repoConfig.test.ts` guards these files (and that every action is used by version tag, with read-only access) so a safeguard cannot be weakened by accident. Once the repository is on GitHub, protect `main` (Settings -> Branches) and require the **CI / verify** check, and also **Security / audit** and **Security / secrets** if you want them to block a merge.

## Writing tests

- **New logic** -> unit tests first, covering edge cases and failure modes, not just the happy path.
- **New or changed UI** -> a component test for behaviour, plus an e2e test if it is a user flow (anything involving navigation, persistence, dragging, or layout).
- **Bug fix** -> write the test that fails first (a regression test), see it fail, then fix.
- **Changed saved data** -> migration + new `fixtures/v<N>.json` + migration test.
- Query by what the user sees (`getByRole`, `getByLabel`), not by CSS classes or test ids. Give controls accessible names; that is also good accessibility.
- Tests must be independent: no shared state, no ordering. E2E tests each get a fresh browser context; call `createProject` / `resetStorage` from `e2e/helpers.ts`.
- No sleeping to wait for things in e2e; use `expect(...).toBeVisible()` / `expect.poll`. No retries: a flaky test is a bug.
- **A new screen or state needs an accessibility scan**: add it to `e2e/accessibility.spec.ts`. A new text colour on a new background goes in the table in `src/theme/contrast.test.ts`. A scan failure names the rule, the element and why; fix the page, do not disable the rule.
- **Make new e2e tests CI-proof before pushing**: run them as CI does (`CI=1 npx playwright test <spec> --repeat-each=3 --workers=6`, after `npx playwright install chromium` once) and fix anything that fails. A click or mouse move at coordinates (`page.mouse`, from a `boundingBox()`) goes nowhere if the element is below the visible window, and the window is only as tall as the viewport: `scrollIntoViewIfNeeded()` first (a page that gains a section, or Linux's slightly taller fonts, can push an element past the fold that was just inside it). A `boundingBox()` does not wait for an element to be shown (`stagePixel` in `e2e/helpers.ts` waits for the stage canvas for you, and `expectDotColor` waits for a dot to be painted a colour, because the canvas is drawn a moment after the data changes, longer on a slow runner); `expect.poll` does not retry a callback that throws (use `?.`); stepping to a formation glides the playhead there, so wait for it to arrive before playing; layout limits need real margin, because Linux fonts are a few pixels bigger.
- Konva canvas content can't be inspected through the DOM. Test positions through the saved data (`savedProject`) and drive the canvas with `stagePixel` (see `e2e/stage.spec.ts`).

## Setup notes

- **Something not working on a new machine? Run `npm run doctor`.** It checks each item below and prints the command that fixes what is wrong (decision 0025). `verify` points to it when the browser tests fail.
- First run on a new machine: `npm install` (also enables the git hooks via the `prepare` script). Local e2e uses the Edge that ships with Windows; elsewhere run `npx playwright install chromium` and set `CI=1`.
- On Windows, run Vitest from a directory spelled with a capital drive letter (`C:\...`). `scripts/verify.mjs` fixes this up for itself, so `npm run verify` works from either spelling; a bare `npx vitest` started from `c:\...` fails every file with "Vitest failed to find the current suite".
- **Do not regenerate `package-lock.json` on Windows.** npm there leaves out the optional WebAssembly packages (the nested `@emnapi/*` entries under `@tailwindcss/oxide-wasm32-wasi` and `@oxc-resolver/binding-wasm32-wasi`) that Linux CI needs, and `npm ci` then fails there with "Missing ... from lock file" while everything passes locally. Adding or updating a dependency on Windows is fine (`npm install <package>`), but check the lockfile diff for removed `@emnapi` entries; if any are gone, rebuild it on Linux from `main`'s lockfile (a `node:24` container: `npm install --package-lock-only`, then a real `npm ci`). Dependabot builds its lockfiles on Linux. (Found while adding `knip`; decision 0025.)
- The pre-commit hook (`.githooks/pre-commit`) runs the full `verify`. Don't bypass it with `--no-verify`.
