# 0016. One repository, modular inside; split only when a trigger fires

- Status: Accepted
- Date: 2026-11-09

## Context
The project owner asked whether to move to several repositories (a "microservices" layout) with this one holding only the UI, placed under a `Dance 360` root folder beside new service repositories.

An honest look at what exists and what is planned:
- The backend is **Supabase** (0001, 0015): managed database, login and file storage. What this project owns there is SQL, access policies and a few small functions, not services.
- There is **one developer** and no server code yet. The reasons to split (independent teams, independent deploys, independent scaling) do not apply.
- The valuable shared code is `model/` (types, count maths, playback, history, timeline) and `persistence/` (migrations, sync rules). The UI and any server-side check must agree on it exactly. Across repositories that means publishing and versioning a package, so one schema change becomes a coordinated release; in one repository it is one `verify` run.
- Each extra repository needs its own CI, CLAUDE.md, hooks, test setup and release flow, and moving this folder would break editor workspaces and the assistant's project memory (keyed by path).

## Decision (made with the project owner)
**Stay one repository, modular inside.** The boundaries are already enforced by `src/architecture.test.ts` (`model/` pure, `persistence/` isolated, features don't import each other, `components/ui/` knows nothing about the app), which gives most of the modularity of separate repositories at none of the cost.

**Where future server-side things go (all in this repository, until a trigger fires):**

| Piece | When | Where |
|---|---|---|
| Database tables, login, row-level security | Sync slices (0015) | `supabase/` folder (migrations, policies), added with that work |
| Audio file storage and its access rules | Optional audio upload | the same `supabase/` folder |
| Link preview (title and thumbnail for video links) | Resources step | one small function in `supabase/functions/` |
| Beat detection | Later | runs in the browser; a worker in `src/audio/` if it is too heavy |
| Notifications, schedule | Phase 2 | decide then |

**Triggers that make splitting worth it** (any one is enough to reopen this decision):
1. A second person or team will own a part and needs to release it independently.
2. A piece needs a different runtime, language or deploy cadence from the web app (for example a long-running audio-analysis service).
3. A piece must scale or be secured independently (for example a public API used by other apps).
4. The repository becomes slow to build or verify in a way modularising cannot fix.

**How it would be split later, in this order:** first turn the repository into workspaces with `apps/web`, `packages/model` (shared by the web app and any server code) and `services/*`, one `verify` and one CI. Only if a service then needs a different owner or release cadence does it move to its own repository, consuming `packages/model` as a published package.

## Consequences
- Nothing moves or is renamed; no re-pointing of editors, CI, or memory.
- A schema change (for example a data-version bump) stays one change with one verification.
- The cost is that everything shares one release cadence. That is fine until a trigger above fires; recording the triggers means splitting is a deliberate decision, not drift.
- Revisit when the first server code arrives (the sync slices): check the triggers then.
