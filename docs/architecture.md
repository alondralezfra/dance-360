# Architecture

*Last verified against the code: 2026-11-09.* Rules marked **(enforced)** are checked by `src/architecture.test.ts`; breaking one fails `npm run verify`.

## Stack

React + TypeScript (Vite), Konva (`react-konva`) for the stage canvas, Zustand for state, React Router, Tailwind v4, Radix (dialog/drawer), dnd-kit (sortable lists), Vitest + Testing Library, Playwright. Rationale: [decisions/0001-tech-stack.md](decisions/0001-tech-stack.md).

## Layout

```
src/
  model/          Pure logic and types. No React, no storage.            (enforced)
    playback.ts     positionsAt(formations, count): the playback engine
    tempo.ts        counts <-> seconds, "Set 3 · Count 5" labels
    history.ts      undo/redo as a pure snapshot stack (record/undo/redo, typing merge)
    timeline.ts     the timeline panel's maths: count <-> pixel, zoom/pan, grid lines, marker hit-testing, dance length
    tapSnap.ts      tap-to-snap: a tap time -> a whole count, which formation a take of taps starts with, and placing a formation on a count
    calibration.ts  speaker-delay measurement: the click track and the delay from the taps (pure); wav.ts packs samples into a WAV file
    peaks.ts        waveform peaks from decoded samples (pure), and the loudness over a stretch of time
    metronome.ts    which metronome clicks fall in a stretch of the song (pure)
    tempoEstimate.ts  estimates a song's tempo and first beat from decoded samples (pure); fft.ts is its spectrum
    formations.ts   stage helpers, count ordering, moveFormation (reorder; counts stay in their slots)
    parts.ts        sections/parts/assignments: which parts apply in a section, which part a dancer is in at a count, ordering, gap detection
    project.ts      new-project factory
    types.ts        the saved Project shape
  audio/          The browser's audio engine, and nothing else: reads a song file (analyze), plays it (player), clicks (metronome), the speaker-delay click track (calibration). No store/UI/storage imports.   (enforced)
  persistence/    Saving projects and song files. Depends on model/ only. (enforced)
    repository.ts              ProjectRepository (what the app uses) and SyncSource (what a future sync engine uses)
    createRepository.ts        the repository, written once over any RecordStore
    recordStore.ts             RecordStore: where envelopes physically live (ids/get/put/delete)
    localStorageRecordStore.ts, memoryRecordStore.ts   the adapters (IndexedDB next)
    syncState.ts               pure sync bookkeeping rules (dirty, revisions, tombstones)
    localStorageRepository.ts  the app's repository: localStorage + one-time import of the old prototype save
    audioRepository.ts         AudioRepository: song files and their cached peaks, found by file hash
    indexedDbAudioRepository.ts, memoryAudioRepository.ts   its two implementations (browser, tests)
    devicePreferences.ts       per-device prefs (which panels are open, the speaker delay); not project data
    projectFile.ts             a project as a backup file: export, strict parsing + migration of an imported file (decisions/0021)
    persistentStorage.ts       asks the browser not to clear this site's data
    migrations.ts              versioned upgrades of saved data
    fixtures/                  frozen example of every saved-data version
  store/          Zustand stores, composed from slices.
    projectStore.ts  the open project: session / project / roster / formation / parts / history slices
    history.ts       records every document change for undo (watches the store, like autosave)
    uiStore.ts       selections (not saved)
    layoutStore.ts   which panels are open (remembered per device, not in the project)
    speakerStore.ts  how late this device's speaker is (remembered per device); calibrationStore.ts is the tap-along measurement
    transport.ts     playing the song: the shared playhead (a count outside React), the player and metronome, play/pause/seek, Mark (tap-to-snap takes), speaker delay
    songStore.ts     the Song tab's state: is the song file on this device, its waveform, busy/error (not saved)
    audioCleanup.ts  clears song files no project uses
    autosave.ts      debounced save of the open project
  features/       Screens, one folder per feature, each documented in docs/features/.  (enforced)
  components/     Shared UI: ui/ (Button, IconButton, Icon, Input, Select, Checkbox, FileButton, Slider, NumberField, SectionHeader, Drawer, Popover; see components.md), ThemeToggle
  theme/          Theme switching + the canvas colour hook
  lib/            Small helpers (cn, readableOn, devicePixels, hash, format, typing, playheadClock, download, useDevicePixelRatio, useElementSize)
  router.tsx      URL map (project screens are tabs: Stage, Cast & Parts, Song)
```

## One repository

This is one repository on purpose (decisions/0016): the backend is Supabase, there is one developer, and `model/` and `persistence/` must stay identical for the UI and any server-side code. The folder boundaries below are enforced by tests, which gives the modularity of separate repositories without their cost. Server-side code (database migrations, access policies, small functions) will live in a `supabase/` folder here when the sync work starts. Splitting into workspaces, and only then into separate repositories, is reconsidered when a trigger fires: a second owner, a different runtime or deploy cadence, independent scaling or security, or a build that can't be made fast. Details and the order of a future split are in 0016.

## Rules

1. **Counts are the source of truth.** Formations store an absolute `count` (0 = Set 1, Count 1), never seconds; `tempo.ts` converts. Fixing the tempo map shifts everything correctly. ([plan §3.1](../dance-director-app-plan.md))
2. **Playback is a pure function.** `positionsAt(formations, count)` returns where everyone is. Anything that can produce a count (editor glide, audio clock, scrubber, phone watch mode, dancer view) renders its result. Never animate positions inside a component, and never invent positions: frame-by-frame motion sets the app's one *playhead* (`playheadClock`, outside React) and `useDotMotion` applies `positionsAt` to the canvas nodes, so a glide or playback does not re-render React every frame. Move the playhead through the transport (`seek`) when the song may be playing, so the audio, selection and metronome stay in step. [decisions/0003](decisions/0003-playback-is-a-pure-function.md), [0014](decisions/0014-canvas-performance.md)
3. **Layering.** `model/` imports nothing from the app. `persistence/` imports only `model/`. Only `store/` and `features/projects/` import `persistence/`. Features don't import other features (pages may compose). **(enforced)**
4. **Storage is behind `ProjectRepository` (and `AudioRepository` for song files).** Browser storage (`localStorage`, `indexedDB`) is touched only in `persistence/` and `theme/`. **The browser audio engine** (`AudioContext` and friends) is touched only in `audio/`, which in turn imports no store, storage or UI code. **(enforced)** [decisions/0017](decisions/0017-song-tab-and-audio-storage.md) The app always works from the local repository; the cloud is reached by a sync engine on top of it (local-first), not by swapping it. Project storage can move from localStorage to IndexedDB by writing another `RecordStore`. Every repository must pass the shared contract suite in `src/test/repositoryContract.ts`. **(enforced)** [decisions/0004](decisions/0004-versioned-persistence-behind-a-repository.md)
5. **Saved data is versioned.** Changing `Project` means: bump `CURRENT_VERSION`, add a migration, add `fixtures/v<N>.json`, add a test. Never edit an old migration. `fixtures.test.ts` fails if you forget.
6. **Saved vs. screen state.** Anything belonging to the project lives in `projectStore` and is autosaved (and undoable; history itself is session-only and not saved). Selections and other screen state live in `uiStore`. Layout preferences ("is the sidebar open") are per device: `layoutStore`, saved by `persistence/devicePreferences.ts`, never in a project or its version number. Ids in `uiStore` may go stale; readers fall back (see `useCurrentFormation`).
7. **Style with theme tokens**, never palette colours or hex: `bg-primary`, `text-muted-foreground`, `border-border`. **(enforced)** Tokens are defined per theme in `src/index.css`; add a theme with another `[data-theme="..."]` block. **Colours have roles**: text is `text-foreground`, `text-muted-foreground` or `text-link` (each 4.5 : 1 on its backgrounds); `text-subtle-foreground` is for icons and decoration only; `--primary` is a fill, never text (use `text-link`). A test checks the contrast of every pair. **(enforced)** [decisions/0023](decisions/0023-accessibility-checks-and-readable-colours.md) Part colours are tokens too: a part stores a palette id (`blue`), the value lives in `--part-<id>`, and components use `style={{ backgroundColor: 'var(--part-blue)' }}` (never hex). [decisions/0005](decisions/0005-theme-tokens.md), [0007](decisions/0007-parts-sections-and-assignments.md)
8. **Reuse `components/ui/`.** Every control is built once there (catalog: [components.md](components.md)). Add a variant or prop rather than repeating class strings; add a new component only on the second use of a pattern. Screens may not use raw `<button>`/`<input>`/`<select>`/`<textarea>`/`<svg>` or text-symbol icons. **(enforced)** [decisions/0011](decisions/0011-component-based-ui.md)
9. **Touch first.** 40px minimum targets, nothing essential behind hover or right-click, panels that are a sidebar on wide screens and a drawer on narrow ones. ([plan §6.5](../dance-director-app-plan.md))
10. **Every feature folder has a doc** in `docs/features/`. **(enforced)**

## Data flow

```
 repository  --load-->  projectStore  --selectors-->  components
     ^                       |  actions                    |
     |                       v                             |
  autosave  <--subscribe--  (document fields change)  <----+
```

Every box above is also what undo restores: the whole document, one snapshot per edit.

The stage: `projectStore.formations` + the shared playhead (`playheadClock`, a count) -> `positionsAt` -> `useDotMotion` moves the dots on the canvas. Two things set the playhead: `usePlayhead` (a preview glide when the person steps between formations) and the transport (`store/transport.ts`: the song's audio while it plays, and jumps). React renders the dots where the playhead is and re-renders only when something structural changes, not per frame. The transport also moves the selected formation along with the song (`uiStore.selectionSource` says who chose).

### Undo/redo

Undo is a stack of earlier `Project` snapshots in `projectStore.history` (session only, 100 steps, never saved). A take of Mark taps is one step: while `projectStore.undoGroup` is set, formation-only changes merge into the step that opened it. `store/history.ts` watches the document fields and records the previous document on every change, so new actions are undoable without knowing about undo. `undo()`/`redo()` put a snapshot back and change `history` in the same update (that is how the recorder skips them); autosave then saves the result. Opening or closing a project clears it. [decisions/0012](decisions/0012-undo-redo-as-snapshots.md)

## Saved data

`Project { name, stage, tempo, song, dancers[], formations[], parts[], sections[], assignments }`.

- `tempo` is `{ bpm, startOffsetSec, changes[] }`. `changes` (`{ atCount, bpm }`) is always empty for now: the shape has room for tempo changes, but `countToSeconds` / `secondsToCount` do not read them yet, so nothing may add one until they do.
- `song` is `null` or `{ name, durationSec, size, mime, hash }`. The audio file is **not** in the project: it is stored separately on the device and found by `hash` ([decisions/0013](decisions/0013-audio-and-timeline-architecture.md)).

- A formation is `{ id, name, count, transitionCounts, positions: Record<dancerId, {x, y}> }` with positions in feet. `formations` is always sorted with strictly increasing `count` (`normalizeCounts`). Reordering formations (`moveFormation`) keeps the *counts* in their slots and moves the formation content into them, so the invariant holds without a data change ([decisions/0010](decisions/0010-reordering-formations-and-collapsible-panels.md)).
- A part is `{ id, name, color, sectionIds }` where `color` is a palette id (`blue`, `red`, `green`, `orange`, `sky`, `pink`, `yellow`, `gray`) and `sectionIds` is the list of sections it applies to, or `null` for all sections (including future ones). An empty list applies nowhere.
- A section is `{ id, name, startCount }`. `sections` is always sorted, the first starts at 0, there is at least one, and a section runs until the next starts (`normalizeSections`), so every count is in exactly one section.
- `assignments` is `sectionId -> dancerId -> partId`: a dancer's *chosen* part. **Never read it directly to find out who is in what part.** Use `effectivePartId` / `partIdAt` (`model/parts.ts`), which apply the rules: `availableParts` = the parts limited to that section if any (they replace the all-sections parts), otherwise the all-sections parts; if exactly one part is available everyone is in it automatically; otherwise it is the chosen part if that part is still available there, else nobody. Nobody only counts as a **gap** (`findGaps`) where two or more parts apply; where none applies (`isUncovered`) the dance isn't split and it is not an error. Stored choices for parts that don't currently apply are kept but ignored.

Stored as `dance360:project:<id>` = `{ version, updatedAt, project, sync }`. `sync` is `{ localRevision, remoteRevision, dirty, deleted }`: bookkeeping for cloud sync that lives *beside* the document (not in it, so it never needs a data-version bump); a project stored without it reads as "never synced". Deleting a project the cloud knows about leaves a tombstone until sync tells the cloud. [decisions/0015](decisions/0015-cloud-storage-and-sync.md)

| Version | Change |
|---|---|
| 0 | Original prototype: formations without timing, no tempo map |
| 1 | `formations[].count` and `transitionCounts`; `tempo` |
| 2 | `parts`, `sections`, `assignments`; migrated projects get "Part A" + "Section 1" with every dancer in Part A |
| 3 | `parts[].sectionIds` (the sections a part applies to; `null` = all); migrated parts all get `null` |
| 4 | `song` (migrated projects get `null`) and `tempo.changes` (migrated projects get `[]`); bpm and start offset are kept |

## Planned (from the build order)

Audio + timeline (step 3). Slices 1 to 4 are built (the v4 data shape and timeline maths; the Song tab with audio storage, waveform and timeline: [features/song.md](features/song.md); playing the song with a metronome: [features/transport.md](features/transport.md); tap-to-snap, draggable markers and speaker delay: [decisions/0020](decisions/0020-tap-to-snap-markers-and-speaker-delay.md)); a missing song file is handled on the Song tab: [decisions/0013](decisions/0013-audio-and-timeline-architecture.md) (an `audio/` folder for browser audio APIs, `model/timeline.ts`, an `AudioRepository` over IndexedDB, saved-data v4 with `song` and `tempo.changes`, a `transportStore`, `features/timeline/`). Resources and notes; the Overview problems list; accounts and cloud sync (designed in [decisions/0015](decisions/0015-cloud-storage-and-sync.md): a sync engine over `SyncSource`, a Supabase remote store, conflicts that ask).
