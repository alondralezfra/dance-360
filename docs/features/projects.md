# Projects (home, workspace, saving)

*Code: `src/features/projects/`, `src/persistence/`, `src/store/`. Plan: §5.1, §5.5.*

## What it does today

- **Home** (`/`): lists projects, most recently edited first; create (`+ New project`, opens it straight away) and delete (asks first). Empty state when there are none.
- **Workspace** (`/projects/:id`): loads the project named in the URL, then shows its header (breadcrumb `Dance 360 › <project name>`, editable project name, **tabs** (Stage, Cast & Parts, Song; the active one is marked `aria-current`), save status, theme toggle) and the current screen. On wide screens the tabs share the header row to leave more room for the screen; on phones they wrap onto their own row. `/projects/:id` redirects to `/stage`. Adding a screen = a route in `router.tsx` plus an entry in `tabs` in `ProjectWorkspace.tsx`.
- **Undo / Redo**: two buttons in the header (disabled when there is nothing to do) and Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z / Ctrl+Y undo and redo the last edit anywhere in the project: dots, formations, dancers, parts, sections, assignments, names. Typing in a name box is one step. The last 100 steps are kept for this session; opening another project or reloading starts clean. In a text box the keys undo the text instead. Undo results are autosaved like any edit.
- **Loading states**: "Loading…" while opening; a friendly message and a link back for a project that doesn't exist or was saved by a newer version of the app. Unknown URLs show a not-found page.
- **Saving**: every change is autosaved ~0.4 s later; the header shows *Saving…* / *Saved* / *Couldn't save*. Pending changes are saved immediately when you switch projects or hide/close the tab. Loading a project doesn't trigger a save.
- **Storage**: currently the browser's `localStorage` (this device only). Each project is stored with a data-version number so older saves are upgraded when opened, plus bookkeeping for future cloud sync (kept beside the project, not in it). Deleting a project removes it immediately (and clears its song file from the device if no other project uses it); once cloud sync exists, a synced project is kept as a hidden tombstone until the cloud is told.
- **One-time import**: the original prototype kept a single project under its own key; the first time the home screen loads it is moved into a real project and the old copy removed (only after the new one is written; unreadable old data is left untouched).
- **Theme**: light/dark toggle on both screens, remembered, defaulting to the system preference.

## Not yet built

Accounts, cloud storage and sync, project settings (song, tempo, stage size UI), duplicate/archive, project cards with thumbnails. See plan §5.1.

## Tests

`Undo.test.tsx`, `src/model/history.test.ts`, `src/store/history.test.ts`, `e2e/undo-redo.spec.ts`, `ProjectsHome.test.tsx`, `src/store/sessionSlice.test.ts`, `src/store/autosave.test.ts`, `src/persistence/*.test.ts` (including the shared repository contract run against localStorage and in-memory stores), `src/theme/theme.test.tsx`, `e2e/projects.spec.ts`, `e2e/theme-and-responsive.spec.ts`.
