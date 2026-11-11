# 0019. Playing the song: one playhead, driven by the audio

- Status: Accepted
- Date: 2026-11-09
- Implements slice 3 of [0013](0013-audio-and-timeline-architecture.md), on the foundation of [0014](0014-canvas-performance.md) (motion outside React) and [0017](0017-song-tab-and-audio-storage.md) (the song file is on the device).

## Context
There was no way to hear the song or watch the formations move against it, which is the only way to check a tempo estimate, a start point, or where counts and formations lie. The pieces existed (the pure `positionsAt`, the dot-motion hook, the stored song file, the tempo map); what was missing was something to play the file and make everything else follow it.

## Decisions (made with the project owner)
- **Playback on both the Song tab and the Stage, with a metronome.** One transport bar (play/pause, "Set 3 · Count 5" readout, a position slider, a "Click on every count" switch) appears above the timeline on the Song tab and in the Stage's bottom bar. The metronome (a tick on every count, a higher one on count 1 of each set) was planned for a later slice; it is here because hearing it against the music is the easiest way to check a tempo.
- **Stacked on the unmerged tempo-estimate branch** so the two can be tested together; everything here works without it.

## Design
- **One playhead for the whole app** (`playheadClock`, moved from the stage into `lib/` and instantiated in `store/transport.ts`): a count outside React. While the song plays the transport sets it every animation frame from the audio; while paused it stays where it was left. The stage dots (`useDotMotion`), the timeline's playhead and the transport bar all read it, so none of them re-renders per frame (0014). Nothing computes positions anywhere but `positionsAt`.
- **The audio is the truth while playing; the playhead is the truth while paused.** Playing seeks the audio to `countToSeconds(playhead)` first, so any way the playhead was moved while paused (a scrub, a tap on the timeline, a step to a formation, a drag) is honoured. Each frame the count is `secondsToCount(player.time())` with the *current* tempo, so editing the tempo while playing just works.
- **`audio/player.ts`** wraps an audio element and exposes `time()`: the browser's position carried forward between its coarse updates, never more than 0.25 s beyond the last report (a stall must not run the clock on). **`audio/metronome.ts`** schedules clicks 150 ms ahead on the audio engine's own clock, topped up every 25 ms, from `model/metronome.ts`'s pure `clicksBetween`; a jump in the song restarts it; clicks too late to sound after a stall are skipped, not fired in a burst. Both take stand-ins, so they are unit-tested without sound; the real browser is covered end to end.
- **The selected formation follows the playhead** (`formationIndexAt`: the last formation that has landed), marked as the playhead's choice (`uiStore.selectionSource`). `usePlayhead` stays out of the way while playing and when the selection merely followed the playhead (so there is no "preview glide" fighting the song), but still previews a step the person takes. A person stepping to a formation, or grabbing a dot, **stops** the song. `usePlayhead` also no longer resets the playhead for edits that don't change when a formation lands (a rename, a moved dot), or when the stage is shown again, so a paused playhead survives switching tabs. The stage draws dots where the shared playhead *is*, not where the selected formation lands.
- **Controls:** Space plays and pauses anywhere in a project except where Space already means something (a text box, button, checkbox, slider, dropdown). The slider moves in whole counts (the dance's resolution) and also works with no song, to look at any count. A tap on the timeline moves the playhead to the nearest count; while playing, the timeline turns the page to keep the playhead in sight until the person scrolls or zooms it themselves (pressing play again hands it back).
- **Ending and errors:** the song stops at its end with the playhead there, and Play starts again from the beginning. A missing song file, or a browser that refuses to start sound (it wants a click first), is explained in plain words and can be retried; the song stays loaded between plays and is released when the project closes or the song changes.
- New shared pieces (decision 0011): `Slider`, `play`/`pause` icons, `lib/typing.ts` (shared by the undo and play shortcuts), `timelineBounds` (shared by the timeline and the slider).

## Not done, on purpose
*(Update 2026-11-10: speaker-delay compensation, tap-to-snap and marker placement are now built: see [0020](0020-tap-to-snap-markers-and-speaker-delay.md).)*
- **No output-latency compensation yet.** The dots follow the audio *element's* position; the sound you hear is later by the speaker's delay (tens of milliseconds wired, 150 to 300 ms over Bluetooth). Calibrating it, as a per-device setting, is planned with tap-to-snap (0013, slice 4). Until then Bluetooth speakers make the dots look early.
- **No slow-down or looping** (not requested for the first version), and **no playback without a song** (counts alone, metronome only).
- Marker dragging and tap-to-snap placement on the timeline remain the next slice.

## Consequences
- The playhead is global screen state, not saved and not undoable.
- Anything that moves the playhead must go through the transport (`seek`) so the audio, selection and metronome stay in step.
- Browser autoplay rules mean playback must start from a click, tap or key press (it always does).
