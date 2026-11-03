# Dance 360

A workspace for dance directors: formations, cast, parts, music and resources in one place.
See [dance-director-app-plan.md](dance-director-app-plan.md) for the full product plan.

## Running it

```sh
npm install     # first time only
npm run dev     # then open http://localhost:5173
npm test        # unit tests (Vitest)
npm run lint
npm run build   # type-check + production build
```

## Tech stack

React + TypeScript (Vite), Konva for the stage canvas, Zustand for state, React Router for
navigation, Tailwind v4 for styling, Radix for accessible primitives (drawer/dialog), Vitest for tests.

## Architecture

```
src/
  model/        Pure logic and types. No React, no storage. Fully unit-tested.
                  playback.ts  positionsAt(formations, count): the playback engine
                  tempo.ts     counts <-> seconds, "Set 3 · Count 5" labels
                  formations.ts, project.ts, types.ts
  persistence/  Saving projects. UI talks to the ProjectRepository interface only.
                  localStorageRepository.ts  current (browser) implementation
                  migrations.ts              versioned upgrades of saved data
  store/        Zustand stores, split into slices.
                  projectStore.ts  the open project (session / project / roster / formations)
                  uiStore.ts       selections (not saved)
                  autosave.ts      debounced save of the open project
  features/     Screens, grouped by feature (stage/, cast/, projects/). Routes in router.tsx.
  components/ui/  Shared building blocks (Button, Input, NumberField, Drawer)
  theme/        Theme switching + canvas colors
  lib/          Small helpers
```

### Rules that keep it extensible

- **Counts are the source of truth.** Formations store `count` (absolute; 0 = Set 1, Count 1),
  never seconds. `tempo.ts` converts to audio time.
- **Playback is a pure function.** `positionsAt(formations, count)` returns where everyone is.
  The stage just renders it. The editor glide, audio playback, phone watch mode and the future
  dancer view should all work by supplying a count; never animate positions inside a component.
- **Changing the saved data shape?** Bump `CURRENT_VERSION` in `persistence/migrations.ts` and add a
  migration (with a test) so existing projects keep working. Never edit an old migration.
- **Never touch `localStorage` outside `persistence/`.** To move to the cloud (Supabase), write
  another `ProjectRepository` and change one line in `persistence/index.ts`. Audio files will need
  IndexedDB / cloud storage, not localStorage.
- **Saved vs. screen state.** Anything that belongs to the project goes in `projectStore`
  (and is autosaved); selections and other screen state go in `uiStore`.
- **Style with theme tokens, not palette colors.** Use `bg-primary`, `text-muted-foreground`,
  `border-border`, etc. Never `bg-indigo-600`. Tokens are defined per theme in `src/index.css`;
  add a theme by adding a `[data-theme="..."]` block. The Konva canvas reads the same variables.
- **Reuse `components/ui/`** instead of repeating class strings; add a variant there when needed.

## Progress (build order from the plan)

- [x] 0. Foundation: versioned persistence, playback engine, themed UI kit, routing, tests
- [x] 1. Static formation editor (stage + dots + multiple formations, with timing in counts)
- [ ] 2. Roster + parts + assignment grid, linked to dot colors
- [ ] 3. Audio + tempo map + timeline + playback
- [ ] 4. Resources + notes
- [ ] 5. Overview problem checks
- [ ] 6. Responsive/mobile refinements
