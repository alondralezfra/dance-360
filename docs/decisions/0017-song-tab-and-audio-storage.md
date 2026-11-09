# 0017. The Song tab and how song files are stored

- Status: Accepted
- Date: 2026-11-09
- Implements slice 2 of [0013](0013-audio-and-timeline-architecture.md).

## Context
Slice 2 of step 3 adds attaching a song, its waveform and a static timeline. 0013 decided the shape (the project saves only a reference; the file lives in the browser behind an `AudioRepository`; derived peaks are cached beside it). Building it raised a few concrete choices.

## Decisions
- **A "Song" tab** (decided with the project owner), beside Stage and Cast & Parts: a focused place for attaching the file, the tempo and the waveform view, which doubles as the phone's full-width timeline mode (plan §6.2). A compact timeline strip under the Stage comes in a later slice using the same pieces. Built as **one branch** (the project owner's choice), as separate focused commits.
- **Storage** is IndexedDB (`indexedDbAudioRepository`), keyed by SHA-256 of the file, with `files` and `peaks` stores. It asks the browser for persistent storage (best effort). An in-memory repository exists for tests, and both pass one shared contract suite (`src/test/audioRepositoryContract.ts`). `fake-indexeddb` (a dev dependency) lets the IndexedDB code run in unit tests, which the 95% coverage threshold on `persistence/` needs; the real browser is covered by the end-to-end tests. The database is looked up lazily, so importing it is safe where there is no IndexedDB.
- **Reading a file is split in two:** `audio/analyze.ts` (the only code allowed to use the browser's audio engine; an architecture test enforces it, and that `audio/` imports no store, storage or UI code) decodes at **8 kHz** and returns plain samples; `model/peaks.ts` (pure) turns samples into **100 levels per second**. Decoding is injectable, so no audio engine is needed to test it. Peaks live beside the file and are recomputed if missing; they are never in the project (large, derived, would bloat saves and undo snapshots).
- **Limits:** audio files only (by type, or extension when the type is blank), at most **60 MB**, and they must decode. A longer file would take too long to analyse on a phone; the limit is one constant (`MAX_SONG_BYTES`).
- **A song whose file is missing** (another device, cleared browser data) is a normal state, not an error: the project keeps its song reference, the Song tab says so and offers *Choose the file again*, and only a file with the **same hash** is accepted. Formations and counts never depend on the file.
- **Clearing files nothing uses** (`pruneUnusedAudio`): after replacing or removing a song, and after deleting a project, files whose hash no stored project uses are removed. Deleted projects still waiting to be synced count as users (they could come back). The open project's song always counts, but a closed project's leftover in-memory fields do not (a bug the end-to-end tests caught). This is why `ProjectRepository` gained `songHashes()`.
- **State that is about the screen, not the project** (is the file here, the peaks, busy, error) lives in `songStore`, not in `projectStore`: it is not saved, not undoable, and describes this device.
- **The timeline is a plain 2D canvas**, not Konva: it is a flat drawing (grid, bars, lines) with no draggable shapes yet, so a drawing function (`drawTimeline`) driven by the pure maths in `model/timeline.ts` is simpler and testable with a recording context. Gestures (drag, wheel, pinch) are one hook. When markers become draggable (a later slice) the choice can be revisited.
- **Shared pieces extracted rather than copied** (decision 0011): `lib/devicePixels.ts` (sharp-canvas helpers, moved out of the stage), `lib/useElementSize.ts` (moved out of the stage canvas), `SectionHeader` (the title block that three Cast sections each wrote out), `FileButton`, `NumberField`'s `decimals`, and the `plus`/`minus` icons.

## Consequences
- The architecture test now also guards `audio/`. New canvas colours are tokens (`--timeline-wave`, `--timeline-marker`).
- A decoded song is held in memory only while it is analysed; a large file on a very old phone could still struggle, which the 60 MB limit and the low decode rate mitigate.
- `navigator.storage.persist()` is a request the browser may refuse (Safari can still evict site data): the re-attach flow is the real safety net.
- Decoding depends on the browser: formats it can't decode are reported as unreadable rather than guessed at.
