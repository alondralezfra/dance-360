# Dance 360: how to work in this repo

A web app for dance directors (formations, cast, parts, music, resources in one place). Product intent: `dance-director-app-plan.md`. How the code is organised and the rules: `docs/architecture.md`. Read the relevant feature doc in `docs/features/` before changing a feature.

## The loop: follow it for EVERY change

1. **Understand.** Read `docs/architecture.md`, the feature doc, and the plan section involved. If the request conflicts with the plan or an open question is involved, ask before building.
2. **Decide small.** For a real technical choice (library, data shape, pattern), write a decision record in `docs/decisions/` (next number, template in its README).
3. **Tests with the code.** New logic: unit tests incl. edge and failure cases. New/changed UI: component tests, plus a Playwright test in `e2e/` for any user flow (navigation, persistence, dragging, layout). Bug: write the failing regression test first, watch it fail, then fix.
4. **Implement** within the architecture rules below.
5. **Update docs in the same change** (see the table in `docs/README.md`): the feature doc, `docs/architecture.md` if structure/rules/data changed, the plan if a decision was made or an open question answered, the checklist in `README.md`, and an entry under **Unreleased** in `CHANGELOG.md`. Docs describe what the app does *now*; never leave stale statements.
6. **Verify: `npm run verify` must pass completely** (change discipline, lint, tests + coverage thresholds, type-check + build, e2e). `npm run verify:quick` is for iterating only; the final run is the full one. If it fails, fix the root cause and run it again.
7. **Look at it.** For UI changes, run the app and exercise the change (or screenshot via Playwright). Passing tests don't prove it looks or feels right. Check phone width too.
8. **Review your own diff** against the checklist below.
9. **Report honestly:** what changed, tests added, docs updated, anything you couldn't verify. Never say "done" if `verify` hasn't passed.

A change is **not implemented** until step 6 passes. The Stop hook and the pre-commit hook enforce this; don't try to get around them.

## Never

- Never weaken, skip (`.skip`, `.only`), loosen, or delete a test, or lower a coverage threshold, to make something pass. A test may be removed only when the behaviour it covers is deliberately removed, and then say so in the changelog.
- Never commit with `--no-verify`, disable hooks, or edit `scripts/`, `.githooks/`, `.claude/settings.json`, or `src/architecture.test.ts` to dodge a check (change them only when deliberately changing the process, and tell the user).
- Never commit unless the user asks. When committing: one logical change, imperative subject line, body explains why.
- Never edit an old migration; never change saved data without the migration steps below.

## Architecture rules (details and rationale: `docs/architecture.md`)

- Counts, not seconds, are the source of truth. Positions over time come only from `positionsAt()` in `src/model/playback.ts`; never animate positions inside a component.
- `model/` is pure (no React/zustand/storage). `persistence/` imports only `model/`. Only `store/` and `features/projects/` import `persistence/`. Browser storage only in `persistence/` and `theme/`.
- **Changing the saved data shape** = bump `CURRENT_VERSION`, add a migration, add `src/persistence/fixtures/v<N>.json`, add a migration test, add a decision record, update the data table in `architecture.md`.
- Project data lives in `projectStore` (autosaved); selections in `uiStore`.
- Style with theme tokens (`bg-primary`, `text-muted-foreground`), never palette colours or hex. Reuse/extend `components/ui/` instead of repeating class strings. New canvas colours need a token in `src/index.css`.
- Each folder in `src/features/` needs a doc in `docs/features/` (a test checks).
- Touch first: 40px targets, no hover-only or right-click-only interactions, layouts that work from phone to desktop.

## Self-review checklist (step 8)

- Does every new behaviour have a test that would fail without it, including error and empty states?
- Accessible names on every control (tests query by role/label)? Keyboard works? Focus sensible?
- Works at 390px wide and at desktop? No horizontal scroll?
- Light and dark theme both fine (tokens only)?
- Data shape changed? Migration + fixture + test done?
- Could this lose a user's saved work? (autosave, migrations, delete confirmations)
- Docs, changelog, plan, README checklist updated and accurate?
- No leftover debugging, dead code, or unrelated edits.

## Commands

`npm run dev` (app on :5173) · `npm run verify` (full gate) · `npm run verify:quick` · `npm test` · `npm run test:coverage` · `npm run test:e2e` · `npm run lint` · `npm run build`. Details: `docs/testing.md`.

## Environment notes

Windows + Git Bash/PowerShell. E2E uses the system Edge locally (`channel: 'msedge'`). Put scratch files in the session scratchpad, not the repo. Playwright specs start their own dev server on port 5199.
