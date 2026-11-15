# 0031. Notes beside the stage

- Status: Accepted
- Date: 2026-11-14

## Context
Decision 0028 left "show notes while the dance plays" as the next slice. The Stage header and bottom bar are already tight (a test guards the stage's share of the screen under zoom), and a count lasts about half a second at a normal tempo. The choices were made with the project owner.

## Decisions
- **Show the section, highlight the count.** The panel lists the notes about the section the playhead is in (its own, then those at counts) and the whole-dance notes. The count note most recently reached is highlighted and stays so until a later count note is reached: showing a note only on its exact count would flash it for half a second. `notesAtCount` (`model/notes.ts`, pure, tested) decides all of it from a whole count.
- **A right-hand panel, closed by default, remembered per device.** It does not take stage room until asked for (the zoom tests keep their margins), mirrors the dancer sidebar, and is a right-hand drawer on a phone. The toggle is at the stage's bottom left, opposite the formation bar's, so neither crowds the header or the part legend. The open/closed choice is a device preference (`notesOpen`), not project data.
- **Read-only.** The panel is for reading while watching; changing a note happens on the Resources tab (one link). Quick-add at the playhead is left for later.
- **All notes, with the part as a tag.** Nothing is filtered by part yet; filtering by the selected dancer's part would need a visible "showing for ..." state.
- **Re-render once per count.** The panel reads the playhead with `useSyncExternalStore` on the whole count, so only this small panel updates as the song plays, never the canvas.

## Consequences
- No saved-data change. Note text is still shown only as text.
- The panel is mounted on wide screens even when closed (so it follows the playhead as it opens); it is hidden and `inert` then.
- A count note stays "now" to the end of its section, even if the next note is far away; if that proves misleading, add an end count to notes (0028 allows it without breaking saved notes).
