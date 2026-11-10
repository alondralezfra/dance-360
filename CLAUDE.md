# Dance 360: how to work in this repo

A web app for dance directors (formations, cast, parts, music, resources in one place). Product intent: `dance-director-app-plan.md`. How the code is organised and the rules: `docs/architecture.md`. Read the relevant feature doc in `docs/features/` before changing a feature.

## The loop: follow it for EVERY change

1. **Understand.** Read `docs/architecture.md`, the feature doc, and the plan section involved, and skim `docs/operations-and-quality.md` for items the change touches (new data, a dependency, an endpoint, a user-facing screen, a failure mode): update an item's status in the same change when it moves. If the request conflicts with the plan or an open question is involved, ask before building.
2. **Ask first.** For anything beyond a trivial fix, think the change through *before* writing code, then ask the user the questions that are genuinely theirs to answer (product behaviour, UX, scope, data-model consequences, trade-offs) with AskUserQuestion: 2-4 focused questions, recommended option first, each saying what it changes. Don't ask what the plan or docs already answer, or things with a conventional default: decide those yourself and list them as assumptions in your reply. Wait for the answers, record decisions that matter (plan, decision record), then build. Skip this step for small bug fixes, refactors with no behaviour change, and doc edits.
3. **Decide small.** For a real technical choice (library, data shape, pattern), write a decision record in `docs/decisions/` (next number, template in its README).
4. **Tests with the code.** New logic: unit tests incl. edge and failure cases. New/changed UI: component tests, plus a Playwright test in `e2e/` for any user flow (navigation, persistence, dragging, layout). Bug: write the failing regression test first, watch it fail, then fix.
5. **Implement** within the architecture rules below.
6. **Update docs in the same change** (see the table in `docs/README.md`): the feature doc, `docs/architecture.md` if structure/rules/data changed, the plan if a decision was made or an open question answered, the checklist in `README.md`, and an entry under **Unreleased** in `CHANGELOG.md`. Docs describe what the app does *now*; never leave stale statements.
7. **Verify: `npm run verify` must pass completely** (change discipline, lint, tests + coverage thresholds, type-check + build, e2e). `npm run verify:quick` is for iterating only; the final run is the full one. If it fails, fix the root cause and run it again.
8. **Look at it.** For UI changes, run the app and exercise the change (or screenshot via Playwright). Passing tests don't prove it looks or feels right. Check phone width too.
9. **Review your own diff** against the checklist below.
10. **Report honestly:** what changed, tests added, docs updated, the assumptions you made without asking, and anything you couldn't verify. Never say "done" if `verify` hasn't passed.

A change is **not implemented** until step 7 passes. The Stop hook and the pre-commit hook enforce this; don't try to get around them.

## Branches and commits: before the first edit, and all the way through

- **Start each piece of work on a fresh branch from an up-to-date `main`**: `git checkout main && git pull --ff-only`, then `git checkout -b <type>/<what>` with type `feature/`, `fix/`, `refactor/` or `docs/`. Do this *before* the first edit. At the start of every task run `git branch --show-current`: if the checked-out branch is already merged, unrelated, or named for something else, don't continue on it.
- **One branch = one logical change** that can be reviewed, merged and reverted on its own, named for what it contains. A large feature is split into slices, each its own branch and PR, merged before a dependent slice starts. If a branch's scope grows, stop and split it instead of renaming it. An unrelated finding gets its own branch, not a drive-by edit.
- **Commit small, focused steps**, staging only the files of that change (the pre-commit hook runs the full verify on every commit, so each commit must stand on its own). Commits only happen when the user asks, so say when a unit of work is verified and ready, so work doesn't pile up uncommitted. When changes start to entangle, commit earlier rather than later.
- **The user opens and merges pull requests** (`gh` is not installed). When a branch is ready, push it only if asked, and give them a PR title, a description and the link `https://github.com/alondralezfra/dance-360/compare/main...<branch>?expand=1`. They merge with a merge commit (not squash) so focused commits survive. CI runs only on pull requests and on pushes to `main`, so a branch is not CI-checked until its PR exists.
- **After a merge:** `git checkout main && git pull --ff-only`, confirm the merge is there, delete the merged local branch with `git branch -d`, and only then start the next branch. Ask before deleting anything on the remote.

## Never

- Never weaken, skip (`.skip`, `.only`), loosen, or delete a test, or lower a coverage threshold, to make something pass. A test may be removed only when the behaviour it covers is deliberately removed, and then say so in the changelog.
- Never commit with `--no-verify`, disable hooks, or edit `scripts/`, `.githooks/`, `.claude/settings.json`, or `src/architecture.test.ts` to dodge a check (change them only when deliberately changing the process, and tell the user).
- Never commit unless the user asks. When committing: one logical change, imperative subject line, body explains why.
- Never push to `main`, force-push, merge a pull request, or delete a remote branch unless the user explicitly asks. Pushing a feature branch also waits for the user to ask.
- Never edit an old migration; never change saved data without the migration steps below.

## Architecture rules (details and rationale: `docs/architecture.md`)

- Counts, not seconds, are the source of truth. Positions over time come only from `positionsAt()` in `src/model/playback.ts`; never animate positions inside a component.
- `model/` is pure (no React/zustand/storage). `persistence/` imports only `model/`. Only `store/` and `features/projects/` import `persistence/`. Browser storage only in `persistence/` and `theme/`.
- **Changing the saved data shape** = bump `CURRENT_VERSION`, add a migration, add `src/persistence/fixtures/v<N>.json`, add a migration test, add a decision record, update the data table in `architecture.md`.
- Project data lives in `projectStore` (autosaved); selections in `uiStore`.
- Style with theme tokens (`bg-primary`, `text-muted-foreground`), never palette colours or hex. Reuse/extend `components/ui/` instead of repeating class strings. New canvas colours need a token in `src/index.css`.
- Each folder in `src/features/` needs a doc in `docs/features/` (a test checks).
- Touch first: 40px targets, no hover-only or right-click-only interactions, layouts that work from phone to desktop.
- **Component-based UI** (catalog and rules: `docs/components.md`). Reuse what is in `src/components/ui/` before writing markup or class strings. Need something different? Add a *variant or prop* to the existing component. Add a *new* component only when a pattern shows up a second time or has accessibility rules worth solving once, and keep the number of components small. Screens never use raw `<button>`/`<input>`/`<select>`/`<svg>` or text symbols (✕ ◀ ▾) as icons: use `Button`, `IconButton`, `Input`, `Checkbox`, `Icon` (a test enforces this). New shared components live in `components/ui/`, know nothing about the app, use theme tokens, have a test, and get a row in the catalog.
- **Good habits**: one source of truth for any rule or value (don't copy it); pure logic in `model/` with tests, thin components; derive state instead of storing it twice; no premature abstraction (extract on the second use); no leftover dead code.

## Self-review checklist (step 9)

- Does every new behaviour have a test that would fail without it, including error and empty states?
- Accessible names on every control (tests query by role/label)? Keyboard works? Focus sensible?
- Works at 390px wide and at desktop? No horizontal scroll?
- Light and dark theme both fine (tokens only)?
- Reused existing components (new ones only if justified and added to `docs/components.md`)? No copy-pasted class strings or markup that already exists as a component?
- Data shape changed? Migration + fixture + test done?
- Could this lose a user's saved work? (autosave, migrations, delete confirmations)
- Docs, changelog, plan, README checklist updated and accurate?
- No leftover debugging, dead code, or unrelated edits.

## Commands

`npm run dev` (app on :5173) · `npm run verify` (full gate) · `npm run verify:quick` · `npm test` · `npm run test:coverage` · `npm run test:e2e` · `npm run lint` · `npm run build`. Details: `docs/testing.md`.

## Environment notes

Windows + Git Bash/PowerShell. E2E uses the system Edge locally (`channel: 'msedge'`). Put scratch files in the session scratchpad, not the repo. Playwright builds the app and serves that production build itself on port 5199 (don't leave something else on that port).
