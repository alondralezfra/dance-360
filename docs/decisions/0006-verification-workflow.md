# 0006. Verification workflow: nothing is done until `verify` passes

- Status: Accepted
- Date: 2026-11-03

## Context
The app will grow quickly with AI-assisted changes. Without a fixed process, docs drift, tests get skipped, and regressions land unnoticed. Instructions alone ("remember to...") are not reliable.

## Decision
A layered system where each layer does what it is best at:
1. `CLAUDE.md` (loaded every session) defines the workflow and rules for Claude.
2. `npm run verify` is the single definition of done: change discipline, lint, unit/integration tests with coverage thresholds, type-check + build, end-to-end tests.
3. Enforcement that doesn't rely on memory: a Claude Code **Stop hook** (`scripts/stop-gate.mjs`) refuses to let a turn finish with failing checks; a git **pre-commit hook** (`.githooks/`) blocks failing commits; `architecture.test.ts` enforces the layering/styling/docs rules; `check-changes.mjs` requires tests, docs and a changelog entry whenever app code changes.

## Consequences
Changes cost more up front (tests, docs, a full verify run of about a minute) and in exchange regressions and doc drift are caught immediately. The checks verify that tests/docs were *touched*, not that they are good, so the review checklist in `CLAUDE.md` still matters. Thresholds and rules may be tightened over time but never loosened to make a change pass. See [../testing.md](../testing.md).
