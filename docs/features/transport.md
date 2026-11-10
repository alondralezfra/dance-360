# Transport (playing the song)

*Code: `src/features/transport/`, `src/store/transport.ts`, `src/audio/player.ts`, `src/audio/metronome.ts`, `src/model/metronome.ts`. Plan: §3.2, §5.4. Design: [decisions/0019](../decisions/0019-playback-and-the-shared-playhead.md).*

## What it does today

- **A transport bar** on the Song tab (above the timeline) and on the Stage (at the top of the bottom bar, so it hides with it). It has:
  - **Play / Pause.** Plays the project's song from the playhead (from the beginning if the playhead is at the end). It is disabled with no song, with a note saying how to attach one.
  - **A readout** of where the song is, "Set 3 · Count 5" (or "Before Set 1" in the intro before the dance starts).
  - **A position slider**, in whole counts, from the start of the song to the end of the dance. Drag it to jump, also while playing. It works with no song too, to look at the stage at any count.
  - **"Click on every count"**: a metronome tick on each count, higher on the first count of each set. Off by default.
- **Everything follows one playhead.** While the song plays: the stage dots move to where `positionsAt` says they are at that count (see [stage.md](stage.md)), the timeline's red playhead moves (see [song.md](song.md)), and the selected formation changes as the song passes each one (the formation bar, name and timing fields follow). Paused, it all stays where it was left, including part-way along a transition.
- **Space** plays and pauses from anywhere in a project, except where Space already does something: in a text or number box, or on a button, link, checkbox, slider or dropdown that has the focus.
- **Playing carries on when you switch tabs**, and the song stops when you close the project, or change or remove its song.
- **Taking over:** stepping to a formation yourself (Previous, Next, a formation in the list, adding or deleting one) or grabbing a dot **stops** the song; the stage then previews the step as before.
- **At the end** the song stops, the playhead stays at the end, and Play starts again from the beginning.
- **Problems are explained** in an alert you can dismiss: "The song file is not on this device. Choose it again on the Song tab." and "The browser would not start the sound. Press Play again." (a browser can insist on a click first).

## How it works

- `store/transport.ts` owns the **shared playhead** (`playheadClock`, a count outside React), the song player and the metronome, and `useTransport` (`playing`, `metronome`, `loading`, `error`, and `play` / `pause` / `toggle` / `seek` / `setMetronome`). `startTransport()` (called at startup) stops everything when the project closes or its song changes, resets the playhead to the first formation when a project opens, and stops playing when the person selects a formation themselves.
- **Playing:** the song file is fetched from the device once (`audioRepository`), played through an audio element (`audio/player.ts`, which smooths the browser's coarse position), and every animation frame the playhead is set to `secondsToCount(player.time(), tempo)` and the selection follows (`formationIndexAt`). **Paused:** the playhead is the truth; the audio is positioned from it when playing starts.
- **The metronome** (`audio/metronome.ts`) schedules clicks a moment ahead on the audio engine's clock using `model/metronome.ts`'s `clicksBetween(tempo, from, to)`; it restarts after a jump and uses the current tempo as it changes.
- The bar re-renders once per count, not per frame (it reads whole counts); the smooth motion is drawn directly by the stage and timeline.
- Browsers only allow sound after a person has clicked, tapped or pressed a key, which playback always follows.

## Not yet built

Compensating for speaker delay (Bluetooth makes the dots look early; a per-device setting is planned with tap-to-snap), tap-to-snap placement and dragging formation markers on the timeline, slow-down and looping a section, playing with no song (counts and metronome only).

## Tests

`Transport.test.tsx` (the bar and the Space shortcut), `src/store/transport.test.ts` (play, pause, seek, ending, errors, following the selection, the metronome, project and song changes, with a stand-in player and metronome), `src/audio/player.test.ts` and `metronome.test.ts`, `src/model/metronome.test.ts`, `src/lib/playheadClock.test.ts`, and `e2e/playback.spec.ts`, which plays real audio in the real browser: the position keeps the tempo (two counts a second at 120 BPM), pause, Space, switching tabs, tapping the timeline, the slider, the end of the song, a missing file, scrubbing moving the dots and the formation, the stage moving on to the next formation as the song plays, stepping or grabbing a dot stopping the song, the metronome clicking (counted through the browser's audio engine) and its louder first count, and the phone layout.
