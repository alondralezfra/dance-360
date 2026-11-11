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

`verify` runs, stopping at the first failure: **change discipline** -> **lint** -> **unit/integration + coverage** -> **type-check + build** -> **end-to-end**.

## The layers

| Layer | Where | Covers | Environment |
|---|---|---|---|
| Unit | `src/model/*.test.ts` | Pure logic: playback maths, tempo, ordering. Fast, exhaustive. | node |
| Integration | `src/store`, `src/persistence` tests | Stores, autosave timing, repository, migrations, error paths. | jsdom |
| Component | `src/**/*.test.tsx` | A screen or control against the real stores: what the user sees and can do. | jsdom + Testing Library |
| Architecture | `src/architecture.test.ts` | The rules in [architecture.md](architecture.md). | node |
| Data fixtures | `src/persistence/fixtures*` | Every saved-data version still loads. | node |
| End-to-end | `e2e/*.spec.ts` | Real flows in a real browser, including dragging dots, reloads, themes, phone layout. | Edge (local) / Chromium (CI) |

Coverage thresholds (lines/statements/functions 95%, branches 90%) apply to `model/`, `persistence/` and `store/`. Code that uses IndexedDB is unit-tested against `fake-indexeddb` (in a test file that runs in the Node environment: jsdom's `Blob` can't be copied by the fake database, though real browsers can); the real browser is covered by `e2e/song.spec.ts` and `e2e/tempo-estimate.spec.ts`, which generate real WAV files so the actual audio decoder runs. Playback is checked in the real browser with real audio (`e2e/playback.spec.ts`, including counting the metronome's clicks through the browser's own audio engine), and in unit tests with a stand-in player and metronome. Tap-to-snap, marker dragging and the speaker-delay setting are checked in the real browser too (`e2e/tap-to-snap.spec.ts`: real taps while real audio plays, marker drags on the canvas); the delay maths (`model/calibration.ts`) is checked against taps made with a known delay, and the flow against stand-in players; whether a real Bluetooth speaker measures right has not been tried. Tempo estimation is checked against made-up beat tracks with a known answer (`src/test/syntheticAudio.ts`, shared by unit and browser tests); it has not been checked against real recorded music. UI is covered by component and e2e tests rather than a percentage. Never lower a threshold to pass; add tests.

## Change discipline (`scripts/check-changes.mjs`)

If anything under `src/` (non-test) changed, the same change must also touch: a test file (or `e2e/`), `CHANGELOG.md`, and something in `docs/` (or the root `README.md`). It runs inside `verify`, on every commit (pre-commit hook), and when Claude finishes a turn (Stop hook). It checks that the files were touched; reviewing that they are *right* is part of the workflow in `CLAUDE.md`.

## Continuous integration

`.github/workflows/ci.yml` runs the same `npm run verify` on GitHub for every push to `main` and every pull request (Ubuntu, Node 24, Playwright's Chromium). On pull requests it first runs `node scripts/check-changes.mjs --base origin/<base branch>`, because CI sees committed work rather than uncommitted work. Failed runs upload Playwright traces. Treat a red CI run exactly like a failing local `verify`: the change is not done. Once the repository is on GitHub, protect `main` (Settings -> Branches) and require the **CI / verify** check.

## Writing tests

- **New logic** -> unit tests first, covering edge cases and failure modes, not just the happy path.
- **New or changed UI** -> a component test for behaviour, plus an e2e test if it is a user flow (anything involving navigation, persistence, dragging, or layout).
- **Bug fix** -> write the test that fails first (a regression test), see it fail, then fix.
- **Changed saved data** -> migration + new `fixtures/v<N>.json` + migration test.
- Query by what the user sees (`getByRole`, `getByLabel`), not by CSS classes or test ids. Give controls accessible names; that is also good accessibility.
- Tests must be independent: no shared state, no ordering. E2E tests each get a fresh browser context; call `createProject` / `resetStorage` from `e2e/helpers.ts`.
- No sleeping to wait for things in e2e; use `expect(...).toBeVisible()` / `expect.poll`. No retries: a flaky test is a bug.
- **Make new e2e tests CI-proof before pushing**: run them as CI does (`CI=1 npx playwright test <spec> --repeat-each=3 --workers=6`, after `npx playwright install chromium` once) and fix anything that fails. A click or mouse move at coordinates (`page.mouse`, from a `boundingBox()`) goes nowhere if the element is below the visible window, and the window is only as tall as the viewport: `scrollIntoViewIfNeeded()` first (a page that gains a section, or Linux's slightly taller fonts, can push an element past the fold that was just inside it). A `boundingBox()` does not wait for an element to be shown; `expect.poll` does not retry a callback that throws (use `?.`); stepping to a formation glides the playhead there, so wait for it to arrive before playing; layout limits need real margin, because Linux fonts are a few pixels bigger.
- Konva canvas content can't be inspected through the DOM. Test positions through the saved data (`savedProject`) and drive the canvas with `stagePixel` (see `e2e/stage.spec.ts`).

## Setup notes

- First run on a new machine: `npm install` (also enables the git hooks via the `prepare` script). Local e2e uses the Edge that ships with Windows; elsewhere run `npx playwright install chromium` and set `CI=1`.
- On Windows, run Vitest from a directory spelled with a capital drive letter (`C:\...`). `scripts/verify.mjs` fixes this up for itself, so `npm run verify` works from either spelling; a bare `npx vitest` started from `c:\...` fails every file with "Vitest failed to find the current suite".
- The pre-commit hook (`.githooks/pre-commit`) runs the full `verify`. Don't bypass it with `--no-verify`.
