# 0021. Backing a project up as a file, and the error screen

- Status: Accepted
- Date: 2026-11-10
- Part of the safety net in [operations-and-quality.md](../operations-and-quality.md). Related: [0004](0004-versioned-persistence-behind-a-repository.md) (versioned saved data), [0015](0015-cloud-storage-and-sync.md) (cloud sync, later).

## Context
Projects live only in the browser's storage. A browser can clear that (Safari after a spell away, low disk space, "clear site data"), and until accounts and sync exist there is no other copy. A crash in a screen showed a blank page with no way to get at the work. Both needed a safety net that does not depend on a server.

## Decisions (made with the project owner)
- **Export a project as a file; import is always a new copy.** A `.dance360.json` file holds the project's saved document in a small header (`kind`, `fileVersion`, `dataVersion`, `exportedAt`). **It never contains the song's audio**, only the song's name, length, size, type and fingerprint (what a project stores anyway), so importing on another device asks for the music again exactly as opening a project there does, and no music is copied into a file that is easy to pass around. Importing always adds a **new project** (a fresh id, "(imported)" added to the name) and never replaces or touches an existing one, so a backup can never overwrite work; importing twice makes two copies.
- **The error screen** (every route's `errorElement`) says something went wrong and that work is autosaved, offers *Reload* and *Back to your projects*, and, if a project was open, *Download this project* (the same export), so a crash cannot trap anyone's work. Technical details are tucked in a disclosure.
- **Three slices, not one**: this branch is the error screen and backup; dependency audit, Dependabot and secret scanning, and accessibility checks in the end-to-end tests follow as their own branches.

## Design
- **`persistence/projectFile.ts`** (pure, tested): `exportProjectFile`, `parseProjectFile`, `projectFileName`, `importedCopy`. A file chosen by the person is untrusted input, so `parseProjectFile` is strict: it refuses text that is not JSON, JSON that is not ours, a wrapper or data version from the future (with "update the app" wording), a file over 5 MB, and a project that is not complete (every list present and well formed, every number a finite number, at least one formation, part and section). An older data version is upgraded with the same `migrateProject` as stored projects, so every saved-data fixture also imports. Problems are `ProjectFileError`s worded for the person; unknown extra fields are ignored, as the app ignores them anywhere.
- **`features/projects/backup.ts`**: `exportProject(id)` loads from the repository and triggers a download (`lib/download.ts`); `importProjectFile(file)` parses and `repository.create`s the copy. The projects home has an *Export* button on every project and an *Import project* button; an import opens the new project. Failures show a dismissible alert.
- **`persistence/persistentStorage.ts`**: after a project is created or imported, the app asks the browser for persistent storage (`navigator.storage.persist()`), once it has something worth keeping; it never throws and does nothing where unsupported. Some browsers grant it quietly, some ask, some refuse; it only improves the odds.
- **Layout fix found on the way**: the projects list was an unconstrained grid, so a long project name stretched the page past a phone's width; it is now `grid-cols-1`.

## Not done, on purpose
- **Not a full backup.** The audio file is not included, and there is no "export everything" or scheduled backup yet. A project that is open and edited since the last export is not in any file.
- **Errors in event handlers and background work are not caught by the error screen** (React error boundaries only catch rendering); those are logged to the console. Error tracking (stage 1 of the checklist) will report them.
- **No "replace" import.** Restoring a backup over a damaged project means importing the copy and deleting the damaged one; a replace flow can come if it is missed.
- **No per-dancer or per-formation export, no other formats.**

## Consequences
- The export file is a versioned contract: changing the saved data shape (a migration, per CLAUDE.md) keeps old files importable, because `dataVersion` goes through the same migrations, and the fixtures test covers that. A change to the *wrapper* bumps `PROJECT_FILE_VERSION`.
- Anything shown by a route can now crash into the error screen instead of a blank page; a new route inherits it from its parent's `errorElement`.
