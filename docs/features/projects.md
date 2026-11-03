# Projects (home, workspace, saving)

*Code: `src/features/projects/`, `src/persistence/`, `src/store/`. Plan: §5.1, §5.5.*

## What it does today

- **Home** (`/`): lists projects, most recently edited first; create (`+ New project`, opens it straight away) and delete (asks first). Empty state when there are none.
- **Workspace** (`/projects/:id`): loads the project named in the URL, then shows its header (breadcrumb `Dance 360 › <project name>`, editable project name, save status, theme toggle), a row of **tabs** (Stage, Cast & Parts; the active one is marked `aria-current`) and the current screen. `/projects/:id` redirects to `/stage`. Adding a screen = a route in `router.tsx` plus an entry in `tabs` in `ProjectWorkspace.tsx`.
- **Loading states**: "Loading…" while opening; a friendly message and a link back for a project that doesn't exist or was saved by a newer version of the app. Unknown URLs show a not-found page.
- **Saving**: every change is autosaved ~0.4 s later; the header shows *Saving…* / *Saved* / *Couldn't save*. Pending changes are saved immediately when you switch projects or hide/close the tab. Loading a project doesn't trigger a save.
- **Storage**: currently the browser's `localStorage` (this device only). Each project is stored with a data-version number so older saves are upgraded when opened.
- **One-time import**: the original prototype kept a single project under its own key; the first time the home screen loads it is moved into a real project and the old copy removed (only after the new one is written; unreadable old data is left untouched).
- **Theme**: light/dark toggle on both screens, remembered, defaulting to the system preference.

## Not yet built

Accounts, cloud storage and sync, project settings (song, tempo, stage size UI), duplicate/archive, project cards with thumbnails. See plan §5.1.

## Tests

`ProjectsHome.test.tsx`, `src/store/sessionSlice.test.ts`, `src/store/autosave.test.ts`, `src/persistence/*.test.ts`, `src/theme/theme.test.tsx`, `e2e/projects.spec.ts`, `e2e/theme-and-responsive.spec.ts`.
