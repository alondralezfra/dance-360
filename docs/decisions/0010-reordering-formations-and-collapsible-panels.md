# 0010. Reordering formations, collapsible panels, and device preferences

- Status: Accepted
- Date: 2026-11-04

## Context
The project owner wanted (1) a bigger stage that doesn't get squeezed by the surrounding bars, especially under browser zoom, (2) to hide the dancer sidebar and the formation bar, and (3) to reorder formations by dragging them.

Formations are ordered by the count they land on, so "change the order" needs a meaning for timing. And "which panels are open" is neither project data nor a selection.

## Decision
- **Reordering = the song's timing slots stay put, the formation moves into them** (`moveFormation` in `model/formations.ts`). Dragging formation 4 to place 2 gives it place 2's count; the formations in between each shift one place and take their new place's count. A formation keeps its name, positions and travel counts. Decided with the project owner. No data-shape change, so no migration. (When the timeline exists, moving a marker along the timeline still changes a formation's *count*; reordering in the strip never does.)
- **Drag-and-drop uses `@dnd-kit`** (`core` + `sortable` + `utilities`) rather than the browser's HTML5 drag events (which don't work on touch) or hand-rolled pointer maths. Mouse needs a 6px move before a drag starts (so a click still selects); touch needs a 200ms hold (so swiping the row still scrolls it). Keyboard reordering is **Alt + Left/Right** on a focused chip rather than dnd-kit's Space/Enter sensor, which would clash with the chip being a button. The library is used only in `features/stage/FormationList.tsx`; the order change itself is the pure function above plus the `reorderFormation` store action, so the library can be swapped without touching the data layer.
- **Collapsible panels** (dancer sidebar, formation bar) animate their width / row height and become `inert` and `invisible` when closed, so hidden controls can't be tabbed to or read out. The open/closed state is **per device**, kept in `store/layoutStore.ts` and saved by `persistence/devicePreferences.ts`; it is not in the project (a collaborator's screen size isn't part of the dance) and is not versioned (unreadable or missing values fall back to "open"). On phones the sidebar remains a drawer; only the formation bar collapses there.
- **Stage sizing**: the fit-to-container maths moved to a pure `features/stage/stageLayout.ts` (shared with the browser tests, which previously duplicated it), margins shrank (20px sides, 32px top/bottom for the labels), the project tabs moved into the header row on wide screens, and the formation bar's timing fields share a row with the other controls.

## Consequences
- **Browser zoom cannot be "countered" cleanly.** Ctrl + shrinks the CSS-pixel viewport; header and bars keep their CSS-pixel heights, so they take a bigger share and the stage (which fits what's left) looks smaller. We deliberately did not rescale the page with `devicePixelRatio` tricks (it breaks text sizing and accessibility zoom). Instead the chrome is slimmer and the bars hide, which gives the room back at any zoom.
- Stage rows of hidden panels animate the canvas container's size each frame; if that ever shows up in profiling, stop observing during the transition.
- Alternatives rejected: re-timing a formation to land between its new neighbours (that's retiming, not reordering); drag-to-resize panels (more to build, not asked for).
