# 0004. Versioned persistence behind a repository

- Status: Accepted
- Date: 2026-11-03

## Context
The prototype saved straight to `localStorage` with no version. The plan needs multiple projects, cloud sync and conflict handling later, and every model change would otherwise silently break saved work.

## Decision
- Storage sits behind a `ProjectRepository` interface; the UI never touches browser storage directly (enforced by `architecture.test.ts`).
- Each saved project is an envelope `{ version, updatedAt, project }`. `migrations.ts` upgrades older versions on load and refuses newer ones.
- `fixtures/v<N>.json` freezes an example of every version; `fixtures.test.ts` fails if the current shape isn't reachable from every fixture.
- Autosave is a debounced store subscription, flushed on project switch and page hide.

## Consequences
Cloud storage = a new repository and one changed line. Every data-shape change costs a migration, a fixture and a test, which is the point. `localStorage` can't hold audio; step 3 will need IndexedDB or cloud storage.
