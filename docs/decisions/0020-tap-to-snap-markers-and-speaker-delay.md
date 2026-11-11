# 0020. Placing formations on the song: Mark taps, draggable markers, speaker delay

- Status: Accepted
- Date: 2026-11-10
- Implements slice 4 of [0013](0013-audio-and-timeline-architecture.md) (tap-to-snap, marker placement, latency calibration) on top of [0019](0019-playback-and-the-shared-playhead.md) (playback and the shared playhead).

## Context
Playback showed the formations against the song but they could only be timed by typing a Set and Count. Plan §3.2 wants the director to place them by ear: tap along as the song plays, or drag markers on the timeline. Bluetooth speakers (150 to 300 ms late) make both inaccurate unless the delay is accounted for. The pure rules were already built and tested in the first slice (`model/tapSnap.ts`: `tapToCount`, `placeFormationAt`).

## Decisions (made with the project owner)
- **A tap re-times the next formation; it never creates or deletes one.** Build the formations on the stage first, then play the song and tap **Mark** (or press **M**) as each should begin. The first tap of a take places the formation after the one the song is in (or the first formation, if the song is still before the dance starts); each tap after places the next one, whatever counts the earlier ones now have. The tap lands on the nearest whole count. The dancers' positions are never touched. When there is nothing left to place the bar says so and changes nothing.
- **A whole take is one undo step.** The first tap opens a take (`projectStore.undoGroup`); everything the taps change is merged into one history step however long it lasts; a pause, a jump or a new play ends it. Only formation changes merge: another edit made meanwhile is its own step.
- **Markers are draggable on the timeline**, in this same branch (the owner chose one branch over two; they are separate commits and separate tests). A press on a marker that moves drags it; one that does not move is an ordinary tap on the timeline; a press anywhere else still scrolls. Fingers get a bigger target than a mouse. The marker snaps to whole counts, shows a "Set N · Count M" label while dragging, and saves only when let go (one undo step); an interrupted drag (second finger, browser cancel) puts it back. It cannot go past the end of the song or dance.
- **Speaker delay is a per-device setting with a tap-along calibration.** Stored in the device preferences (not in the project: the speaker belongs to the device, like the open panels). Typed in, or measured: a click track plays through the same player the song uses, the person taps on every click, and the delay is the median of how much later than each click the player's position was at the tap.

## Design
- **Model (pure, tested):** `firstToPlace(formations, count)` (which formation a take starts with), `placeFormationAt` (see below), `model/calibration.ts` (the click track's times and samples, and `estimateSpeakerDelay`: each tap matched to the nearest click, accidents and misses ignored, median, none if fewer than 5 matched, never negative, at most 1000 ms), `model/wav.ts` (samples to a WAV file), and `record(..., windowMs)` in `model/history.ts` so an explicit take can merge for as long as it is open.
- **`placeFormationAt` no longer sorts.** It used `normalizeCounts`, which re-sorts by count: placing a formation past the next one swapped their order. It now pushes later formations on just enough, so the running order never changes by placing or dragging. (`setFormationCount`, used by the Set and Count boxes, still sorts, as before.)
- **Transport (`store/transport.ts`):** `mark()`, the take cursor, and the speaker delay. While playing, the dots show where the music is *heard*: `count = secondsToCount(player.time() - delay)`; starting or jumping seeks the audio the delay ahead so what is heard matches the playhead; a tap uses the same offset. The metronome is unchanged (its clicks come through the same speaker as the song).
- **`store/speakerStore.ts`** (the delay, remembered via `persistence/devicePreferences.ts`, whose save now merges so one screen's setting never wipes another's), **`store/calibrationStore.ts`** (the measurement's screen state) and **`audio/calibration.ts`** (plays the click track with `createPlayerFromBlob` and notes `player.time()` at each tap; no `AudioContext`, so the measured quantity is exactly the one the transport uses).
- **UI:** a Mark button next to Play on the transport bar (Song tab and Stage; switched off until the song plays), a status line for what each tap did (screen readers on the Stage, visible on the Song tab), a "Speaker delay" section on the Song tab, and `markerAt` / `onMarkerDrag` / `onMarkerDrop` / `onMarkerCancel` in `useTimelineGestures`.

## Not done, on purpose
- **The delay is one number.** It cannot tell the speaker's delay from the person's reaction time (taps along with a steady beat mostly cancel the reaction), and it is not remembered per output device (switching from headphones to a Bluetooth speaker means setting it again).
- **Markers are not keyboard-focusable** (they are drawn on a canvas); the Set and Count boxes on the Stage do the same job from the keyboard.
- **Taps cannot go back and fix an earlier formation**: a new take starts from where the song is. Dragging a marker is the way to nudge one.
- **No count-in** before a take, and no auto-scroll while dragging a marker (zoom out to drag far).

## Consequences
- Anything that places a formation on a count while the song may be playing should end a take: go through the transport (`seek`, `pause`).
- Real-world accuracy of the delay is unverified: it has been tested with a generated click track and stand-in players, not with a Bluetooth speaker.
- `undoGroup` is screen state in the project store (not saved, not part of the document); it must be `null` whenever no take is open.
