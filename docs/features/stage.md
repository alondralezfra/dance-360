# Stage (formation editor)

*Code: `src/features/stage/`. Route: `/projects/:id/stage`. Plan: §5.4.*

## What it does today

- Shows the stage as a canvas (Konva): floor, 2 ft grid, dashed centre line, UPSTAGE / AUDIENCE labels. Stage size defaults to 40 x 24 ft and is scaled to fit the available space.
- Dancers appear as dots with initials and a name label. **Drag** a dot to move it; it snaps to a 0.5 ft grid on release and can't leave the stage (while dragging it stops at the edge; positions are clamped when saved). The selected dancer gets a ring.
- **Part colours**: a dot is filled with the dancer's part colour for the section the stage is currently in (unassigned dancers are neutral gray), so colours change as you move to a formation in another section. A legend at the top right shows the current section and the parts that apply in it ("Everyone", in gray, where none do). Parts, sections and assignments are edited on the Cast & Parts tab ([cast.md](cast.md)).
- **Formations** are a sequence of positions for everyone. The bottom strip lets you:
  - step to the previous/next formation, or jump to one from the list;
  - add a formation (a copy of the current one, one set later), rename it, delete it (the last one can't be deleted; deleting selects the neighbour);
  - set **when it lands** (`Set` + `Count` fields, stored as one absolute count) and its **travel counts** (how many counts before landing the dancers spend moving there; default 4).
- Stepping between **adjacent** formations glides the dots over ~0.7 s (the transition into the next formation, or reversed going back). Skipping formations, zero-length travel, or *reduced motion* jump instantly.
- Counts are always unique and in order: if you set a formation to a count another one has, or past another one, the list re-sorts / later formations shift by the minimum needed.
- Wide screens: dancer panel is a sidebar. Phones: a **Dancers** button opens it as a drawer.

## How it works

- `usePlayhead(formations, current)` returns the **count** being shown, animating it between adjacent formations. It never computes positions.
- `positionsAt(formations, count)` (`src/model/playback.ts`) turns that count into everyone's positions. Dancers *arrive* on a formation's count and travel during its `transitionCounts` before it, never starting before the previous formation lands. This same function will drive audio playback.
- `StageCanvas` draws what `positionsAt` returns. Dragging stops any glide first (`settle`) and writes to the store (`moveDancer`) on release.
- Colours come from the theme (`useCanvasTheme`), so the stage follows light/dark. A dot's part comes from `partIdAt(sections, assignments, dancerId, count)` using the same playhead count, and its colour from the part's palette id (`--part-<id>` tokens).

## Not yet built

A "show only Part X" filter (deferred until the timeline exists), playback with audio, timeline and tap-to-snap, undo/redo, multi-select, formation tools (align, mirror, presets). See the plan, build-order steps 2–3.

## Tests

`FormationStrip.test.tsx`, `usePlayhead.test.tsx`, `src/model/playback.test.ts`, `e2e/stage.spec.ts` (including real drags, edge clamping, per-formation independence, reload persistence), and `e2e/cast.spec.ts` (dot colours read from the canvas).
