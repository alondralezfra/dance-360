# 0022. Dependency audit, automatic updates and secret scanning

- Status: Accepted
- Date: 2026-11-10
- Part of the safety net in [operations-and-quality.md](../operations-and-quality.md). Builds on the CI in [0006](0006-verification-workflow.md).

## Context
The app depends on open-source libraries whose vulnerabilities are found over time, and a backend is coming that will have real secrets (keys, tokens). Neither was checked by anything: `npm audit` was never run in CI, dependencies only changed when someone remembered, and nothing would stop a key being committed. None of this needs a server or an account.

## Decisions (made with the project owner)
- **The audit blocks on high or critical advisories in libraries that ship in the app** (`npm audit --omit=dev --audit-level=high`) and **only warns for build and test tools**. Tools never reach users and often have advisories with no fix; blocking on them would turn every pull request red until someone worked around it. The same check runs every Monday, so a new advisory shows up even when no one opens a pull request. `npm run check:deps` runs the blocking check locally.
- **Secrets are scanned by gitleaks in CI**, on every pull request and `main`, and over the full history weekly. It is a maintained, well-known scanner with a ready-made GitHub Action. The repository owner also switches on GitHub's own **secret scanning and push protection** (repository settings), which stop a key before it is pushed; those settings cannot be set from the repository.
- **Dependabot opens weekly pull requests** for npm and GitHub Actions: minor and patch updates grouped into one pull request, major updates one at a time (they can need real changes), at most 5 npm and 3 Actions pull requests open at once. They are reviewed like any other change, and CI runs on them.

## Design
- Two workflows, not one: `ci.yml` (the whole verification, the required **CI / verify** check) is untouched and stays as fast as before; `security.yml` has an `audit` and a `secrets` job, runs on its own schedule too, and has read-only access (`permissions: contents: read`).
- Actions are used by **version tag** (`@v4`, `@v2`), never a moving branch; Dependabot keeps them current. A test (`src/repoConfig.test.ts`) guards that, the read-only access, the audit commands, the history-wide scan and the Dependabot settings, so a safeguard cannot be weakened by accident.

## Not done, on purpose
- **Actions are not pinned to commit hashes.** That is stronger against a hijacked tag, but harder to read and review; Dependabot can maintain hashes later if the project wants it.
- **No audit in `npm run verify`.** It needs the network and its result changes without any code change, so it would make a local gate fail for reasons outside the change. It is a CI check and a local script instead.
- **No automatic merging** of Dependabot pull requests, and no licence checks or software bill of materials yet.
- **The gitleaks Action is free for personal repositories**; if the repository moves to an organisation it needs a licence key (or the scan switches to the open-source binary).

## Consequences
- A pull request can now fail for a reason unrelated to its own code (a new advisory in an app library). That is the point: fix it by updating the library (usually Dependabot has already opened that pull request).
- Add **Security / audit** and **Security / secrets** to the required checks on `main` (a GitHub setting) to make them block merges.
