# Stage (formation editor)

*Code: `src/features/stage/`. Route: `/projects/:id/stage`. Plan: §5.4.*

## What it does today

- Shows the stage as a canvas (Konva): floor, 2 ft grid, dashed centre line, UPSTAGE / AUDIENCE labels. Stage size defaults to 40 x 24 ft and is scaled to fit the available space (`stageLayout.ts`: 20px side and 32px top/bottom margins for the labels).
- **Sharp at any zoom.** The stage is drawn at the screen's real pixel ratio: it re-renders when browser zoom or display scaling changes it (`useDevicePixelRatio`), and the floor edges, grid lines, dots and text are snapped to whole device pixels so they don't smear across two.
- Dancers appear as dots with initials and a name label. **Drag** a dot to move it; it snaps to a 0.5 ft grid on release and can't leave the stage (while dragging it stops at the edge; positions are clamped when saved). The selected dancer gets a ring.
- **Part colours**: a dot is filled with the dancer's part colour for the section the stage is currently in (unassigned dancers are neutral gray), so colours change as you move to a formation in another section. A legend at the top right shows the current section and the parts that apply in it ("Everyone", in gray, where none do). Parts, sections and assignments are edited on the Cast & Parts tab ([cast.md](cast.md)).
- **Formations** are a sequence of positions for everyone. The bottom strip lets you:
  - step to the previous/next formation, or jump to one from the list;
  - add a formation (a copy of the current one, one set later), rename it, delete it (the last one can't be deleted; deleting selects the neighbour);
  - set **when it lands** (`Set` + `Count` fields, stored as one absolute count) and its **travel counts** (how many counts before landing the dancers spend moving there; default 4).
- Stepping between **adjacent** formations glides the dots over ~0.7 s (the transition into the next formation, or reversed going back). Skipping formations, zero-length travel, or *reduced motion* jump instantly.
- **Reorder by dragging.** Press and drag a formation in the bottom strip to move it; the others make room. Mouse: drag after a few pixels of movement (a plain click still selects). Touch: hold briefly, then drag (swiping scrolls the row). Keyboard: focus a formation and press **Alt + Left/Right**. The song's landing counts stay in their places and the formation moves into the new place's count (so "Finale" dragged to first lands where the first formation did); each formation keeps its name, positions and travel counts. The selected formation stays selected.
- Counts are always unique and in order: if you set a formation to a count another one has, or past another one, the list re-sorts / later formations shift by the minimum needed.
- Wide screens: dancer panel is a sidebar. Phones: a **Dancers** button opens it as a drawer.
- **Hide panels for a bigger stage.** On wide screens the arrow button at the top left slides the dancer sidebar away (and back); the button at the bottom right slides the formation bar away, leaving a small "Show formation bar" button to bring it back (also on phones). Hidden panels can't be tabbed to. What you hid is remembered on this device (not saved in the project).
- **Browser zoom:** Ctrl + makes the page narrower in CSS pixels while the header and bars keep their height, so they take more of the screen and the stage (which fits the room left) shrinks. The chrome is slim (tabs share the header row on wide screens) and hiding the formation bar gives the room back.

## How it works

- The **playhead clock** (`playheadClock.ts`) holds the **count** being shown, outside React. `usePlayhead(clock, formations, current)` drives it, animating the count between adjacent formations; it never computes positions. Audio playback will drive the same clock.
- `positionsAt(formations, count)` (`src/model/playback.ts`) turns that count into everyone's positions. Dancers *arrive* on a formation's count and travel during its `transitionCounts` before it, never starting before the previous formation lands. This same function will drive audio playback.
- `fitStage(size, stage)` (`stageLayout.ts`, pure) decides the scale and where the stage sits in the canvas; the browser tests use it too.
- `FormationList` is the only place that knows about `@dnd-kit`; a drop calls `reorderFormation(id, toIndex)`, which uses `moveFormation` (`src/model/formations.ts`).
- `StageCanvas` renders each dot at its **resting** position (the selected formation, from `positionsAt`). While the clock moves, `useDotMotion` calls `positionsAt` and sets the dot nodes' positions directly on the canvas, so React does **not** re-render per animation frame. React re-renders only for edits, selection, size changes, or when the playhead enters another section (which changes the dot colours; `useSyncExternalStore` over `sectionIndexAt`). `DancerDot` and `StageFloor` are memoised and get stable callbacks. Dragging stops any glide first (`settle`) and writes to the store (`moveDancer`) on release. Dots have no drop shadow (it halved frame time at 100 dancers). Measured: 40 dancers hold 60fps on a CPU ~4x slower than a laptop; see [decisions/0014](../decisions/0014-canvas-performance.md).
- Colours come from the theme (`useCanvasTheme`), so the stage follows light/dark. A dot's part comes from `partIdAt(sections, assignments, dancerId, count)` using the same playhead count, and its colour from the part's palette id (`--part-<id>` tokens).

## Not yet built

A "show only Part X" filter (deferred until the timeline exists), playback with audio, timeline and tap-to-snap, undo/redo, multi-select, formation tools (align, mirror, presets). See the plan, build-order steps 2–3.

## Tests

`StageCanvas.test.tsx` (no per-frame React renders), `useDotMotion.test.tsx`, `playheadClock.test.ts`, `FormationStrip.test.tsx` (incl. reordering), `StagePage.test.tsx` (collapsing), `stageLayout.test.ts`, `usePlayhead.test.tsx`, `src/model/playback.test.ts`, `e2e/layout-and-reorder.spec.ts` (real drag reorder, keyboard reorder, collapsing, zoom, phone), `e2e/stage.spec.ts` (including real drags, edge clamping, per-formation independence, reload persistence), and `e2e/cast.spec.ts` (dot colours read from the canvas).
