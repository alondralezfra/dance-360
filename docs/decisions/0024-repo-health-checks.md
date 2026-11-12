# 0024. Repo health checks: file size, unused code, duplicates, honest docs

- Status: Accepted
- Date: 2026-11-12
- Builds on the verification workflow in [0006](0006-verification-workflow.md) and the layering tests in [architecture.md](../architecture.md).

## Context
Most of the project's rules are checked by tests, but a few things that make a codebase hard for people and AI assistants to work in were only caught by self-review: files that grow into one place where everything happens, code nobody uses any more, the same code or paragraph copied in two places, and documents that promise files the repo no longer holds. The app is small (about 8,000 lines of application code, the largest file 278 lines), so these are cheap to keep clean now and expensive to clean later.

## Decision (made with the project owner)
- **File size.** Application files may have at most 400 lines; tests (`*.test.*`, `e2e/`, `src/test/`) at most 900, because a test file is a flat list of cases and splitting it adds little. An allowlist (with a mandatory reason, and checked for stale entries) is the escape hatch; it starts empty.
- **Unused code: `knip`.** Unused files, exports, types and dependencies fail the check. `scripts/stop-gate.mjs` (run by a Claude Code hook) is declared an entry point, and `jscpd` is declared as a command-line tool.
- **Duplicates: `jscpd`**, over source, tests, scripts **and the markdown docs** (10 lines / 100 tokens, zero allowed). The docs are included so a rule is written in one place and linked from the rest. Fixtures and the changelog are ignored.
- **Docs name real things.** A test reads every current document (not the changelog or past decision records, which are history) and fails when a markdown link or a backticked path points at a file or folder that is not there. Code blocks, patterns (`*`, `<N>`) and URLs are skipped.
- **Hard fail**, in `npm run verify` (a "Repo health" step after lint, and the tests in the unit-test step), so CI and the pre-commit hook enforce it too.

## Consequences
- The first run found six exports used only inside their own file (the `export` was dropped) and 15 lines of the WAV writer copied into a test helper (the helper now calls `encodeWav`).
- New dev dependencies: `knip` and `jscpd`, covered by the existing audit and Dependabot setup ([0022](0022-dependency-audit-updates-and-secret-scanning.md)).
- An export written for a later slice will fail `knip` until something uses it: add it when it is used. A real exception goes in `knip.json` with a reason in this record.
- The docs check can be fooled by a path that exists but is the wrong file, and it does not check that prose is true. Review still has to do that.
- **Not done, on purpose:** a limit on function length or complexity (the lint tool does not offer a cheap one; revisit if files stay under 400 lines but functions grow), a generated-code check (the repo has no generated code; `dist/` and `node_modules/` are ignored), and per-folder contract/ownership files (single repository, see [0016](0016-single-repository-modular-monolith.md)).
