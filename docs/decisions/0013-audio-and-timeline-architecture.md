# 0013. Audio and timeline: how they fit the count model

- Status: Accepted (design only; nothing built yet. This is build-order step 3.)
- Date: 2026-11-09
- Builds on [0002](0002-counts-are-the-source-of-truth.md) and [0003](0003-playback-is-a-pure-function.md).

## Context
Step 3 adds the song, a timeline (waveform, count grid, formation markers), playback and tap-to-snap. A review of the current code found the count model already fits (seconds exist only in `model/tempo.ts`; anything producing a count can drive `positionsAt`), and that `tempo` is stored but unused (no UI, `setTempo` has no callers), so its shape is cheap to change now and costly later.

## Decisions (made with the project owner)
- **Counts stay whole numbers.** No half-counts ("&") for now. Recorded as a revisit item: if wanted later it is a data migration, cheapest while there are few projects.
- **One BPM per project, shaped for tempo changes.** MVP UI is BPM + start point. The v4 migration adds `tempo.changes: { atCount, bpm }[]`, always empty until the piecewise feature is built (`countToSeconds`/`secondsToCount` will then integrate over it; they are the only code that reads tempo, so nothing else changes).
- **Song stored in the browser (IndexedDB), behind an `AudioRepository`**, with a **re-attach flow**. The project document stores only `song: { name, durationSec, size, mime, hash } | null`, never the file. The file is stored by `hash`; opening a project where it is missing (other device, cleared storage, Safari eviction) shows "Attach the song" and accepts the file if its hash matches. Cloud storage later is another `AudioRepository`, as with projects. Audio is never uploaded without explicit opt-in (plan §10).
- **First audio version includes:** playback, the timeline, **tap-to-snap**, **metronome / count-in**. Slow-down and loop-a-section are **not** in the first version; the design keeps them cheap (see below).

## Design
**Layers (rules in `docs/architecture.md` when built):**
- `model/` stays pure: `model/timeline.ts` (count <-> pixel for a zoom/scroll window, grid lines for sets and counts, snapping, marker hit-testing) and the tap-to-snap rule (given a tap time and the tempo, which count does the next formation land on). Tested like `playback.ts`.
- `audio/` (new folder, browser APIs only): the player (wraps an `HTMLAudioElement`; exposes a smooth clock in seconds), the metronome (Web Audio oscillator clicks scheduled ahead on the audio clock), and peaks extraction (decode once, downsample, cached). Only `audio/` may touch `Audio`/`AudioContext` (to be enforced by `architecture.test.ts`, like storage).
- `persistence/`: `AudioRepository` (`put(blob) -> hash`, `get(hash)`, `remove`, peaks cache) with an IndexedDB implementation; requests persistent storage so the browser is less likely to evict the song.
- `store/`: a `transportStore` for playing/paused and the playhead (screen state, not saved, not undoable). Per-device audio latency and tap latency go in `devicePreferences` (they depend on the hardware, not the dance).
- `features/timeline/` (own doc in `docs/features/`): the waveform/grid/marker panel, transport bar, song setup (attach file, BPM, start-point nudge, metronome toggle). `StagePage` composes it; features still don't import each other.

**Clock:** `seconds = audio.currentTime` (interpolated with `performance.now` between its coarse updates) minus the device latency; `count = secondsToCount(seconds, tempo)`; `positionsAt(formations, count)`. `usePlayhead` generalises to three sources of a count: idle (selected formation), glide (preview, as today), playing (audio). `StageCanvas` already only reads a count and does not change. Playback-rate and looping would be one more input to this clock, which is why they stay cheap; they are simply not scheduled.

**Data v4 (one migration, when built):** `song: null` and `tempo.changes: []` on existing projects; the migration, fixture and test rules in `architecture.md` apply. Derived data (waveform peaks) is not in the document: it is cached beside the audio by hash and recomputed if missing.

**Build in slices, each shippable:** (1) v4 migration + `model/timeline.ts` + tests, no UI; (2) AudioRepository, attach song, peaks, static timeline; (3) transport and playback driving the stage, with the canvas performance work from the performance review; (4) marker dragging/grid placement, metronome, tap-to-snap with latency calibration; (5) missing-audio states and the re-attach flow polish.

## Risks to design around
- **Latency:** Bluetooth output adds 100-300ms and phone clocks are coarse, hence the per-device offset and a simple calibration step.
- **Storage eviction:** Safari can evict site data; mitigated by `persist()`, the hash-matched re-attach flow and never treating the audio as the only copy.
- **Memory:** decoding a song for peaks is heavy on phones; decode once, store peaks, release the buffer (a worker if needed). Playback itself streams from the element.
- **Timeline drag vs reorder:** dragging a marker changes a formation's count (`setFormationCount`, which pushes later ones just far enough); dragging in the formation strip swaps content between slots ([0010](0010-reordering-formations-and-collapsible-panels.md)). They are different actions and stay different.

## Alternatives considered
Decoding the whole song into a Web Audio buffer for playback (precise, but memory-heavy and no pitch-kept slow-down); waiting for cloud storage before audio (blocks step 3); storing peaks in the project (large, derived, would bloat saves and undo snapshots).
