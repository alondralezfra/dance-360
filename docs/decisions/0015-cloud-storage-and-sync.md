# 0015. Cloud storage and sync: local-first, conflicts ask, one director first

- Status: Accepted (design, plus the backend-free preparation, which is built. Accounts, the sync engine and the server are not.)
- Date: 2026-11-09
- Extends [0004](0004-versioned-persistence-behind-a-repository.md). Related: [0012](0012-undo-redo-as-snapshots.md) (undo), [0013](0013-audio-and-timeline-architecture.md) (audio).

## Context
Plan §6 wants cloud data, autosave and sync conflict handling so edits on a phone and a laptop reconcile cleanly, and offline use in rehearsal rooms with poor signal. The repository seam from 0004 was the right start, but `save(id, project)` was a blind overwrite (two devices would silently destroy each other's work), `remove` was a hard delete (another device's push would resurrect it), and `updatedAt` came from the device clock.

## Decisions (made with the project owner)
- **Local-first with background sync.** The app always reads and writes the local repository (instant, works offline). A sync engine mirrors changes to the cloud and pulls changes from other devices. Autosave stays local and fast; a network save can never be lost to closing the tab, because the local write already happened.
- **Conflicts stop and ask.** If a project changed on this device *and* in the cloud, nothing is merged or overwritten silently. The person chooses **"Use theirs"** (the cloud version replaces this copy) or **"Keep mine as a copy"** (this device's version is kept as a separate new project, and the original takes the cloud version). Per-item automatic merge is deferred until real conflicts are observed.
- **First cloud release: one director, many devices.** Account, sync and backup. The database has memberships with a role from day one (plan §109) but only `director` exists. Co-directors, dancers and share links come later on the same foundation.
- **Prepare the repository now** (built in this change).

## Built now (no backend, no data-format change)
- `ProjectRepository` is implemented **once**, in `persistence/createRepository.ts`, over a small async **`RecordStore`** (`ids/get/put/delete`). `localStorageRecordStore` and `memoryRecordStore` are the adapters; an IndexedDB adapter can replace localStorage (which holds only ~5MB, too little for many projects) without touching any logic.
- **Sync bookkeeping beside each document** (in the stored envelope, not in the `Project`, so `CURRENT_VERSION` and its migrations are unchanged): `localRevision` (up on every local change), `remoteRevision` (the cloud's revision this copy last matched, or null), `dirty`, `deleted`. Pure rules in `persistence/syncState.ts`. Projects stored before this read as "never synced, dirty".
- **Deleting is a tombstone** once the cloud knows the project (so another device can't bring it back); a project the cloud never saw is simply removed, as before. `save` on a deleted project throws instead of resurrecting it.
- **`SyncSource`**, a second interface only a sync engine uses (screens can't reach it): `listSyncRecords`, `markSynced(id, {localRevision, remoteRevision})` (stays dirty if the project was saved again during the upload), `applyRemote` (first download and "use theirs"), `purge`.
- A shared **contract test suite** (`src/test/repositoryContract.ts`) that every repository, including the future cloud-backed one, must pass; run today against localStorage and in-memory.

## Design for later
**Server (Supabase, as expected in 0001):** `projects(id uuid, owner_id, name, data jsonb, schema_version int, revision bigint, updated_at, deleted_at)` and `project_members(project_id, user_id, role)`, with row-level security. The document stays one JSON value (it is edited, undone, migrated and uploaded as a whole); only fields needed for queries are real columns. Saving is one atomic compare-and-set (`update ... where id = $id and revision = $base`) that returns the new revision, or a conflict; **the server assigns `revision` and `updated_at`**, never the device. Deleting sets `deleted_at`.

**Sync engine** (a new folder, started like autosave, once built; it uses `SyncSource` and a `RemoteProjectStore` interface):
- *Push:* each dirty record is uploaded with `base = remoteRevision` (insert if null). Success -> `markSynced` with the `localRevision` that was sent. Conflict -> mark the project "needs a decision" and show the dialog above.
- *Pull:* new cloud projects -> `applyRemote`; cloud newer and local clean -> `applyRemote`; cloud newer and local dirty -> conflict; deleted in the cloud and local clean -> remove locally; deleted in the cloud but edited here -> conflict (keep mine / accept deletion).
- *Triggers:* after autosave goes quiet (about 3-5s, compressed), when the app regains focus, on reconnect, and on a timer. Status shown next to the save indicator (Saved / Syncing / Offline / Needs attention).
- **A cloud update to the project that is open** must not look like a user edit: it clears undo history, falls back selections, and must not be re-saved by autosave (that would bump `localRevision` and ping-pong between devices). It needs its own store path, like undo has.

**Versions across devices:** the row stores `schema_version`. A client refuses to push if the cloud copy is newer than it understands (it asks the person to update the app) and the server refuses writes older than the row, so a stale installed app can never downgrade data. Migration stays lazy and client-side (on open).

**Accounts and privacy:** the app works fully without an account. Cloud sync is explicit opt-in (a roster is personal data, possibly about minors): on first sign-in the person chooses to upload their existing local projects ("claim"); signing out keeps local copies by default. Export (download JSON) and delete-account are part of the account screen. **To decide when accounts are built:** two accounts on one shared device must not mix projects, which probably means recording the owning account in the sync bookkeeping.

**Audio:** a remote `AudioRepository` (storage bucket, path by file hash, access by project membership), upload opt-in with a quota, resumable. The project document is unchanged (0013).

## Slices, each shippable
(0) this preparation; (1) sync engine against an in-memory fake "cloud", with conflict scenarios and no network; (2) Supabase schema, policies and sign-in; (3) the real remote store, sync status and the conflict dialog; (4) claim local projects, sign-out, export/delete; (5) audio upload; (6) co-directors and dancers (members, roles, filtered views). Before (3), move project storage from localStorage to IndexedDB (a new `RecordStore`).

## Consequences and risks
- Everything the UI does stays unchanged; screens can't see sync state until we add a status.
- Conflicts should be rare (one director taking turns across devices) but data loss is not acceptable, hence ask-first.
- localStorage's quota is the nearest real limit; the adapter makes the fix small.
- Safari can evict browser storage; the cloud copy is the real fix.
- Last-write-wins and automatic merge were rejected for the first release (silent loss; complexity).
