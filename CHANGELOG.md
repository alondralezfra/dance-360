# Changelog

All notable changes. Newest first. Add an entry under **Unreleased** in the same change as the code (enforced by `npm run verify`); group by Added / Changed / Fixed / Removed, and mention data-format changes and migrations explicitly.

## Unreleased

### Added (placing formations on the song: build-order step 3, slice 4)
- **Mark (tap-to-snap).** A **Mark** button next to Play on the Song tab and the Stage (and the **M** key), available while the song plays. Tap it when the next formation should begin and that formation lands on the nearest whole count. The first tap places the formation after the one the song is in (or the first one, before the dance starts), each tap after places the next, and the dancers' positions are not touched. The bar says what each tap did, and says so when there is nothing left to place. **A whole take of taps is one undo step.**
- **Drag formation markers on the timeline** to move a formation: snaps to whole counts, shows "Set N · Count M" while dragging, saves when let go (one undo step), cannot pass the formation before it, pushes later ones on instead of passing them, and a drag that is interrupted puts the marker back. Fingers get a bigger target than a mouse; a press away from a marker still scrolls, and a press on a marker that does not move still moves the playhead.
- **Speaker delay.** A new section on the Song tab: type how late this device's speaker sounds (0 to 1000 ms), or **Calibrate by tapping** along to a short click track and let the app measure it. While playing, the dots now show where the music is *heard*, so they line up with the sound on a Bluetooth speaker, and taps are placed using the same offset. Kept on this device, not in the project.
- New: `model/calibration.ts`, `model/wav.ts`, `firstToPlace` in `model/tapSnap.ts`, `audio/calibration.ts`, `store/speakerStore.ts`, `store/calibrationStore.ts`, `placeFormation` and `undoGroup` in the project store, `record(..., windowMs)` in `model/history.ts`, marker callbacks in `useTimelineGestures`, a `callout` in `drawTimeline`, the `flag` icon. Decision record 0020. No saved-data change (the speaker delay is a device preference).

### Fixed (timeline taps)
- A tap on the timeline is now judged by when the finger came down and up, not by when the page got round to handling the events. On a busy or slow device (or right after a song is attached, while it is being analysed) a quick tap used to be counted as a long press and ignored, so the playhead did not move.

### Fixed (tooling)
- `npm run verify` no longer fails every unit test when it is started from a working directory spelled `c:\...` (lower-case drive letter), which is how Claude Code's Stop hook starts it: Vitest loaded itself twice and reported "Vitest failed to find the current suite". `scripts/verify.mjs` now switches to the canonical spelling first.

### Fixed (placing formations)
- `placeFormationAt` (not reachable from the app before this change) swapped a formation with the next one when placed past it; it now pushes the later one on and keeps the running order.
- `saveDevicePreferences` now keeps the preferences it was not given instead of replacing them all.

### Added (docs: operations and quality checklist)
- `docs/operations-and-quality.md`: the standing checklist for delivery, security, privacy, reliability, accessibility, accounts and AI features, each item with a status and the stage or trigger at which it applies, plus a per-change review and a suggested order of the first slices. Linked from the docs index, the plan and the workflow in CLAUDE.md. No code change.

### Added (playing the song: build-order step 3, slice 3)
- **Play the song and watch the dance move with it.** A transport bar (Play / Pause, a "Set 3 · Count 5" readout, a position slider, and a "Click on every count" switch) on the Song tab and at the top of the Stage's bottom bar. While it plays the stage dancers move through the formations in time with the music, the selected formation follows the song, and the timeline shows a moving red playhead. Pause leaves everything where it was, even part-way along a transition.
- **Metronome:** a tick on every count, higher on the first count of each set, to check a tempo or start point by ear.
- **Space** plays and pauses from anywhere in a project (not in a text box, or on a button, link, checkbox, slider or dropdown that has focus). Playing carries on when you switch tabs.
- **The timeline:** tap or click to move the playhead to the nearest count; it turns the page to keep the playhead in sight while playing (until you scroll or zoom yourself; pressing play hands it back). The slider also works with no song, to see the stage at any count.
- Stepping to a formation yourself, or grabbing a dot, stops the song. At the end the song stops and Play starts again from the beginning. A missing song file, or a browser that wants a click first, is explained and can be retried.
- **Not yet:** the dots follow the audio element, so a Bluetooth speaker (150 to 300 ms late) makes them look early; calibrating speaker delay comes with tap-to-snap. No slow-down or looping.
- New: `store/transport.ts` (the shared playhead, player and metronome), `audio/player.ts`, `audio/metronome.ts`, `model/metronome.ts`, `formationIndexAt`, `followPlayhead`, `timelineBounds`, `features/transport/`, `Slider`, `play`/`pause` icons, `lib/typing.ts`, a `--timeline-playhead` colour token, `uiStore.selectionSource`. Decision record 0019, feature doc `docs/features/transport.md`. No saved-data change.

### Changed (playback)
- The Stage's bottom bar is capped at 40% of the window height (it scrolls inside itself) and its vertical spacing is tighter, so the stage keeps its room under browser zoom with the new transport bar. (The first version only just met the zoom guard on Windows and missed it by a hair on the Linux CI runner; it now has margin.)
- The playhead clock moved from the stage to `lib/` and is shared by the whole app. The stage draws dots where the playhead is, not only on the selected formation; `usePlayhead` takes options, no longer resets the playhead when the stage is shown again or for an edit that doesn't change when a formation lands (a rename, a moved dot), and stays out of the way while the song plays.
- The undo shortcuts' "is this a typing place?" check is now shared (`lib/typing.ts`); the timeline's bounds are one shared function.

### Added (the tempo is estimated from the song)
- **Attach a song and its tempo is worked out for you.** The BPM and where the first beat lands are estimated from the music. If the tempo is still the default, it is filled in (with a note that it is an estimate to check against the waveform); if you have already set your own tempo it is never overwritten, and the estimate is offered with a *Use this tempo* button. If the song has no steady beat it says "Could not tell the tempo" and changes nothing. Attaching the song and the estimated tempo are one undo step.
- **Half**, **Double** (an estimate is often exactly half or double what you count to) and **Estimate from song** (work it out again on request) buttons in the Tempo section.
- How it works, measured accuracy and known limits are in decision 0018. On made-up beat tracks it finds 90 to 160 BPM to within a quarter of a BPM, with jitter and noise, and the first beat to within 20 ms; slow songs often come out doubled and very fast ones (170+) can be off. **It has not been tested on real recorded music.**
- New: `model/tempoEstimate.ts` and `model/fft.ts` (pure), `isDefaultTempo`, `setSong(song, tempo?)`, `songStore` `tempoNote` / `acceptEstimate` / `estimateFromSong`, `analyzeAudio` now also returns the tempo (skippable), `src/test/syntheticAudio.ts` (made-up beat tracks for unit and browser tests). No saved-data change.

### Added (the Song tab: build-order step 3, slice 2)
- **A Song tab.** Attach a music file (MP3, M4A, WAV, OGG, FLAC...), replace it, or remove it (asks first). It shows the name, length and size. Files must be audio, at most 60 MB, and decodable; problems are explained and change nothing. Counts still work with no song.
- **The song file stays on your device** (IndexedDB, found by a hash of its contents, so it survives reloads and works offline); the project saves only its name, length, size, type and hash. Files nothing uses any more are cleared (after replacing or removing a song, or deleting a project).
- **A song whose file isn't on this device** (opened elsewhere, or browser data cleared) shows "The song file is not on this device" with *Choose the file again*; only the same file is accepted. Formations and counts are unaffected.
- **Tempo:** BPM (decimals allowed) and the start point in seconds, with 0.01 s nudge buttons.
- **A timeline:** the song's waveform lined up with a count and set grid and numbered formation markers. Drag to scroll; mouse wheel, trackpad or two-finger pinch to zoom; Zoom in / Zoom out / Fit buttons. Sharp at any browser zoom; has a text summary for screen readers.
- New pieces: `audio/analyze.ts` (the only code that uses the browser audio engine), `model/peaks.ts`, `AudioRepository` (IndexedDB and in-memory, with a shared contract test), `songStore`, `pruneUnusedAudio`, `ProjectRepository.songHashes()`; `FileButton`, `SectionHeader`, `NumberField` `decimals`, `plus`/`minus` icons; canvas colour tokens `--timeline-wave` and `--timeline-marker`.
- Architecture tests: only `audio/` may use the browser audio engine, and `audio/` imports no store, storage or UI code. New dev dependency: `fake-indexeddb`.
- Decision record 0017. Feature doc `docs/features/song.md`.

### Changed
- The title block of the Parts, Sections and Assignments sections is now the shared `SectionHeader` (no visible change). The sharp-canvas helpers moved to `lib/devicePixels.ts` and the element-size hook to `lib/useElementSize.ts` so the timeline can use them too.
- `NumberField` can keep decimal places (`decimals`); whole numbers remain the default.

### Fixed
- (Caught by the new browser tests before release.) Deleting a project now clears its song file; a closed project's leftover in-memory song was wrongly counted as in use.

### Added (docs: repository structure)
- Decision record 0016: the project stays **one repository, modular inside** (not microservices). Records why (Supabase is the backend, one developer, `model/` and `persistence/` must stay in step), where future server-side pieces will live (a `supabase/` folder), the triggers that would make splitting worthwhile, and the order a future split would follow (workspaces first, then separate repositories). Architecture doc and plan §9 updated. No code changes.

### Added (song and timeline model: build-order step 3, slice 1)
- **Saved-data v4:** a project has `song` (`null` until one is attached; name, length, size, type and a content hash, never the audio itself) and its `tempo` gains `changes` (always empty for now). Existing projects are upgraded on open with no song and no tempo changes; their bpm and start point are kept. Fixture `v4.json`, migration tests, and `setSong` in the store; undo covers the song. See decisions/0013.
- `model/timeline.ts`: pure maths for the timeline panel (count to pixel and back, zoom around the pointer, panning within bounds, grid lines that thin out as you zoom out, snapping, marker hit-testing, how long the dance is).
- `model/tapSnap.ts`: tap-to-snap rule (a tap time, minus latency, becomes a whole count; a tapped formation lands there without leaving its place in the order).
- No visible change yet: the song, timeline and playback screens come in the next slices.

### Changed
- The v0 migration writes its default tempo (120 bpm, start 0) out in full instead of reading the shared default constant, so it cannot change when the default does. Behaviour is identical.

### Changed (process)
- **Branching rules** added to CLAUDE.md: each piece of work starts on a fresh, purpose-named branch from an up-to-date `main`; one branch is one logical change (large features are split into slices, one PR each); small focused commits; the user opens and merges pull requests with a merge commit; no pushing to `main`, force-pushing or remote-branch deletion without being asked. Written after one branch grew to hold four unrelated pieces of work.

### Added (cloud-sync preparation)
- **The repository is ready for cloud sync** (no account or server yet; nothing changes for users). Project storage is now one implementation (`createRepository`) over a small `RecordStore` adapter (localStorage, in-memory; IndexedDB can be added without touching the logic). Each stored project carries sync bookkeeping beside the document (local revision, last cloud revision, dirty, deleted), kept out of the project so there is **no saved-data version change and no migration**; projects saved earlier read as never synced.
- A project the cloud will know about is deleted as a hidden tombstone so another device cannot bring it back; a late save of a deleted project is refused instead of resurrecting it. Projects the cloud never saw are removed outright, as before.
- `SyncSource` interface (for the future sync engine only) and a shared repository **contract test suite** every repository must pass (run against localStorage and in-memory).
- Decision record 0015: local-first sync, conflicts that ask (use theirs / keep mine as a copy), one director on many devices first, the Supabase table and compare-and-set design, versions across devices, privacy and opt-in, and the build slices. Plan §6 updated.

### Changed (canvas performance)
- **Smooth stage on phones.** Measured on a CPU ~4x slower than a laptop (roughly a mid-range phone), 40 dancers went from ~32fps to a steady 60fps during a formation glide, 100 dancers from ~16fps to ~42fps, and 200 dancers now hold 60fps on a laptop. This is the path audio playback will use.
- Dot motion no longer re-renders the stage every frame: a playhead clock (outside React) drives `useDotMotion`, which moves the dots directly on the canvas using `positionsAt`. React re-renders only for edits, selection, size changes and section changes (colours). `StageCanvas` is split into `StageFloor`, `DancerDot` and the motion hook; dots and floor are memoised with stable callbacks.
- **Dots no longer have a soft drop shadow** (it cost about half of each frame at 100 dancers); they keep their crisp outline.
- `usePlayhead` now takes the clock and drives it (instead of returning a count).
- Decision record 0014 (measurements, method, results, what was left out on purpose).
- Tests: no per-frame React renders during a glide, dots still move and land on the formation, colours change exactly at section boundaries, clock and motion hook units.

### Added (docs: audio and timeline design)
- Decision record 0013 (how audio, the timeline, tap-to-snap and the metronome fit the count model; saved-data v4 plan; build slices and risks). Plan §9 updated: tempo changes, music file storage and half-counts answered for now. No code or data changes.

### Added (undo / redo)
- **Undo and Redo for every project edit** (dots, formations, reordering, dancers, parts, sections, assignments, names): buttons in the project header and Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z (or Ctrl+Y). Typing in a name box is one step; the last 100 steps are kept for the session and are never saved, so a reload or opening another project starts clean. Shortcuts are ignored inside text boxes so the browser's text undo still works. Undone states are autosaved.
- `model/history.ts` (pure snapshot history), `store/history.ts` (records edits by watching the store), `undo`/`redo` store actions, `undo`/`redo` icons. No saved-data change. Decision record 0012; plan §9 updated (version history is still open).

### Added (components, sharper stage)
- **Shared components:** `Icon` (one inline-SVG icon set), `IconButton` (icon + required accessible label), `Checkbox`, a shared `fieldClass` look for text-like controls, a `chip` variant on `Button` (selected state from `aria-pressed`) and an `inline` variant on `Input`. Catalog and rules: `docs/components.md`; decision record 0011.
- `src/architecture.test.ts` now fails if a screen uses a raw `<button>`, `<input>`, `<select>`, `<textarea>` or `<svg>`, or a text symbol as an icon (a deliberate extension of that file).
- `useDevicePixelRatio` hook (`lib/`).

### Changed
- Text-symbol icons (✕ ◀ ▶ ▲ ▼ ▾ ☀ ☾ ›) are now `Icon`s; the four copy-pasted remove buttons, the formation chips, the dancer-name field, the section dropdown and its checkboxes now use the shared components. Dancer rows and the project-name field are 40px tall (touch target).
- The collapsed formation bar button reads "Show formation bar" (visible text matches its accessible name; it was "▲ Formations").
- Stage layout snaps the floor, grid and dots to whole device pixels. The "centred" unit test now allows one device pixel of rounding.

### Fixed
- **Stray scrollbar next to the Cast & Parts tab:** the tab bar was 1px taller inside than its box (the underline trick plus `overflow-x: auto`), a regression from moving the tabs into the header.
- **Blurry stage text, grid and dots:** the canvas kept its original resolution after browser zoom (or moving the window between screens) changed the pixel ratio, so the browser stretched it. It now re-renders at the new ratio, and edges, lines, dots and labels are aligned to whole device pixels.

### Added (reorder formations, hideable panels, bigger stage)
- **Drag to reorder formations** in the bottom strip (mouse: drag; touch: press and hold, then drag; keyboard: Alt + Left/Right). The song's timing slots stay put and the formation moves into the new slot, keeping its name, positions and travel counts. `moveFormation` in `model/formations.ts`, `reorderFormation` in the store, drag handling in `features/stage/FormationList.tsx` using `@dnd-kit`. No saved-data change.
- **Slide-away panels:** the dancer sidebar (wide screens) and the formation bar (all screens) can be hidden for a bigger stage and shown again with a button; remembered per device (`store/layoutStore.ts`, `persistence/devicePreferences.ts`), not stored in the project.
- Decision record 0010.

### Changed
- **Bigger stage:** smaller margins around it, a more compact formation bar (timing fields share the controls row), and on wide screens the project tabs share the header row (about 50px more height).
- Stage fitting maths extracted into a pure, tested `stageLayout.ts`; browser tests now use it instead of a copy.
- Known limit: under browser zoom (Ctrl +) the header and bars keep their CSS-pixel size, so the stage still gets a smaller share of the screen than at 100%; hiding the formation bar gives the room back. See decision 0010.

### Added (parts limited to specific sections)
- A **sections dropdown** on each part (next to the colour): "All sections" or any combination of sections (checklist; keyboard and touch friendly). Use it for songs where most sections have one uniform part and only some (e.g. Chorus 1 and Chorus 2) split into several, such as Floor and Standing.
- Where **exactly one part applies in a section, everyone is in it automatically**: the grid cell is read-only and never shows a "missing assignment". Where several apply, the cell offers only the parts that apply there. Parts limited to a section replace the all-sections parts there.
- A new section keeps the previous section's parts; removing a section removes it from the parts that listed it (a part left with none shows "No sections").
- The stage legend lists only the parts that apply in the current section.
- Popover control (`@radix-ui/react-popover`); `availableParts`, `effectivePartId`, `toggleSectionInScope`, `sectionScopeLabel` in `model/parts.ts`; `setPartSections` in the store.
- Tests: part-limiting logic, store cascades, the dropdown (component and browser), the choruses-only scenario end to end, stage colours and legend per section, upgrading a version-2 project, and phone layout of the dropdown.

### Changed
- **A section where no part applies is no longer an error.** Previously, limiting parts so a section had none (e.g. Floor and Standing only in Verse 1, nothing in the Chorus) flagged every dancer as missing there, in cells that offered no way to fix it. Now it means everyone dances together: the grid cell reads "Everyone" (read-only), dots are the neutral gray, the legend shows a gray "Everyone" chip, and only sections where two or more parts apply can have missing assignments. See `docs/decisions/0009-uncovered-sections-and-default-part.md`.
- **New projects start with a part called "Everyone"** (on all sections) instead of "Part A", so it reads as the uniform base that other parts override; the next part you add is "Part A". Existing projects keep their part names.
- The grid's status line reads "No missing assignments." (was "Everyone has a part in every section.", which isn't true in an uncovered section).
- **Behaviour change:** a project with only one part (including a brand-new project) now puts every dancer in that part automatically, instead of showing them as unassigned until picked. With two or more parts that apply in a section, dancers still need picking as before.
- The assignment grid's scroll box now contains its screen-reader-only text; without that, hidden text in a wide grid could stretch the whole phone page sideways.
- Part rows wrap onto a second line on narrow screens to make room for the sections control.
- Browser tests now run against the **production build** (built fresh and served with `vite preview`) instead of the dev server. Same assertions, but they test what actually ships, and the full suite runs in about 40 seconds instead of 80-130. Under parallel load the dev server made tests that take 3 seconds on their own take 14, and a few hit the 30-second timeout.

### Data format
- Saved-data **v3**: each part gains `sectionIds` (`null` = all sections). Existing projects are upgraded on open with every part on "All sections", so nothing changes for them. See `docs/decisions/0008-parts-limited-to-sections.md`.

### Added (parts, sections and assignments: build-order step 2)
- **Cast & Parts** tab with project tabs in the workspace header (Stage | Cast & Parts).
- **Parts**: colour-coded groups (name + one of 8 colour-blind-safe colours); add, rename, recolour, remove (asks first if dancers are assigned).
- **Sections**: contiguous stretches of the song defined by a start count; add (copies the previous section's assignments), rename, move, remove.
- **Assignment grid**: dancers by sections, each cell a dropdown of parts; missing assignments are outlined, counted and listed. Scrolls sideways on narrow screens.
- **Stage**: dots are coloured by the dancer's part in the current section (neutral gray if unassigned), with a legend showing the section and parts. The dancer list dots show the same colours.
- Select control; `model/parts.ts` (part/section/assignment logic) and `lib/color.ts` (readable initials).
- Tests: part/section logic, store, migration + fixture for data v2, Cast & Parts and legend components, and browser tests that read real dot colours from the canvas (both themes), mid-song colour changes, upgrading an old project, and phone layout.

### Changed
- The selected dancer on the stage is drawn with a ring instead of changing colour, so the part colour stays visible. Canvas colour tokens: `--dot`/`--dot-stroke`/`--dot-selected-stroke` replaced by `--dot-unassigned`, `--dot-outline`, and a ring-colour `--dot-selected`; new `--part-*` tokens.
- Buttons never wrap their label onto several lines.
- Header: the "Stage" breadcrumb segment was replaced by the tabs.

### Data format
- Saved-data **v2**: projects gain `parts`, `sections` and `assignments`. Existing projects are upgraded on open to one part ("Part A") and one section ("Section 1") with every dancer already in Part A, so they look the same as before. See `docs/decisions/0007-parts-sections-and-assignments.md`.

### Added (workflow)
- Verification workflow: `npm run verify` (change discipline, lint, tests + coverage, type-check + build, browser tests), a Claude Code Stop hook and a git pre-commit hook that enforce it, and `CLAUDE.md` describing the process. See `docs/decisions/0006-verification-workflow.md`.
- Test suite: component tests (dancer panel, formation strip, number field, theme, playhead, projects home), integration tests (repository, autosave, project loading), architecture-rule tests, saved-data fixtures, and 27 Playwright browser tests covering projects, the stage editor (including real drags), theme and phone layout.
- Documentation set in `docs/`: architecture, testing, per-feature docs, and decision records.
- GitHub Actions workflow (`.github/workflows/ci.yml`) running `npm run verify` on pushes to `main` and pull requests; `scripts/check-changes.mjs --base <ref>` checks a whole branch for tests, docs and changelog.
- `CLAUDE.md` workflow gained an "Ask first" step: before building anything non-trivial, ask the product questions that are the owner's to answer.

## 0.1.0 — 2026-11-03 (foundation)

### Added
- Projects home and `/projects/:id/stage` workspace (React Router); multiple projects.
- Formation timing: each formation has a `count` (Set/Count fields) and travel length; project has a tempo map. Pure playback engine `positionsAt(formations, count)`.
- Autosaving, versioned storage behind a `ProjectRepository` interface, with migrations. The old single-project save is imported automatically.
- Light/dark themes via semantic tokens; shared UI components (Button, Input, NumberField, Drawer).

### Changed
- State split into slices; saved project data separated from UI selection state.
- Code reorganised into `model/`, `persistence/`, `store/`, `features/`, `components/`, `theme/`.

### Data format
- Saved projects are now versioned. v0 (prototype) -> v1 adds `formations[].count`, `formations[].transitionCounts` and `tempo`.

## 0.0.0 — prototype
- Static formation editor: stage, dancers, formations, drag to place, glide between formations.
