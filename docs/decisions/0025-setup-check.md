# 0025. A setup check (`npm run doctor`) and one source for the Node version

- Status: Accepted
- Date: 2026-11-13
- Part of the process set up in [0006](0006-verification-workflow.md) and [0024](0024-repo-health-checks.md).

## Context
A new machine (or a new assistant session) fails in confusing ways when something basic is missing: an old Node, `npm install` not run, the git hook not switched on, no browser for the end-to-end tests, or a leftover program on the port those tests use. The failure shows up three minutes into `verify`, far from the cause. The Node version was also written only in the CI files, with nothing to check it against.

## Decisions (made with the project owner)
- **`npm run doctor` checks five things and only reports.** Node version, installed packages, the git hook (`core.hooksPath`), a browser for the e2e tests (Edge locally; Playwright's Chromium when `CI=1`), and port 5199 being free. Each failure prints the command that fixes it. It never installs or changes anything.
- **On demand, not part of `verify`.** `verify` stays fast and fails only for reasons inside the change. When the e2e step fails, `verify` prints a pointer to `npm run doctor`.
- **The Node version is written once**: `engines.node` (`">=24"`) in `package.json`. A test (`src/repoConfig.test.ts`) fails if a workflow's `node-version` is a different major.
- **Pre-hosting release checklist** in [operations-and-quality.md](../operations-and-quality.md): only what applies with no hosting or accounts. The Stage 1 to 3 rows stay where they are and are linked, not copied.

## Design
- The judging is pure functions in `scripts/doctorChecks.ts`, unit-tested with made-up answers (including each failure); `scripts/doctor.mjs` only looks at the machine and prints. Node 24 runs the TypeScript file directly (no build step), so `engines.node` is also what makes the script work.

## Consequences
- The script itself (reading the real machine) has no automated test beyond running it by hand: `npm run doctor` on a healthy machine, and with port 5199 occupied and `CI=1` set to see failures.
- **Lockfile lesson, found while adding `knip` (documented in [testing.md](../testing.md)):** `npm install` on Windows leaves the optional WebAssembly packages (nested `@emnapi/*` entries) out of `package-lock.json`, so `npm ci` on Linux CI failed with "Missing ... from lock file" while everything passed locally, and `npm ci --dry-run` on Windows cannot see it. The fix that worked was rebuilding the lockfile on Linux from `main`'s. Not automated yet: a check that every lockfile change keeps those entries would need a Linux step; revisit if it happens again.
- **Not done, on purpose:** a `--fix` mode (a script that changes the machine), running the check in `verify` or CI (CI installs everything fresh), and checking disk space, git identity or editor settings.
