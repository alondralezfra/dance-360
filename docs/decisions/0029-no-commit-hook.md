# 0029. No commit hook: verify runs once before review, and in CI

- Status: Accepted
- Date: 2026-11-13
- Partly supersedes [0006](0006-verification-workflow.md) (the git pre-commit hook it set up). The Stop hook, `npm run verify` and CI from 0006 stay.

## Context
0006 made `npm run verify` run on every commit (a git pre-commit hook), as well as when Claude finishes a turn (the Stop hook) and in CI. In practice the same suite ran three or four times for one change: once by Claude while checking the work, once more by the hook on commit, once in CI on the pull request, and once by the Stop hook. Each run takes about three to four minutes (most of it the browser tests), so the commit hook alone added that wait before every commit, including small follow-up commits and ones that split a verified change in two, and held up merging. It checked nothing the other runs do not: the code it ran was the code Claude had just verified, and CI re-checks the whole pull request anyway.

## Decision (made with the project owner)
- **Remove the git pre-commit hook.** A commit or push now takes a moment.
- **The full `verify` runs twice, not four times.** The Stop hook still runs it when Claude finishes a turn that left code uncommitted (and blocks the turn while it fails), and CI runs it on every pull request and on `main` (a merge needs it green). Claude no longer also runs the full suite by hand: while working it uses `npm run verify:quick` and targeted tests, and says so in its report.
- Everything that existed only for the hook goes with it: `.githooks/`, the `prepare` script that switched it on, the `--staged` options of `verify` and the change-discipline check, and the setup check's (`npm run doctor`) "Git hooks" test.

## Consequences
- A commit can now contain code that was not fully verified (someone who commits by hand without running `verify` finds out in CI). The pull request is the gate, as the branch rules already intend.
- Each commit is no longer checked on its own, so a branch split into several commits is only known to pass as a whole. Reviewers read commits one by one, so each should still stand alone; that is now a habit and not enforced.
- Existing clones keep `core.hooksPath` set to a folder that no longer exists, which git ignores silently; `git config --unset core.hooksPath` tidies it.
- The Stop hook only sees uncommitted changes, so code that Claude commits in the same turn it was written is not run by the hook: CI is then the full run, and Claude says so.
