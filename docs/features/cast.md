# Cast & Parts

*Code: `src/features/cast/`. Routes: the dancer list is part of the Stage screen; parts, sections and the assignment grid are at `/projects/:id/cast` (the **Cast & Parts** tab). Plan: §2, §3.5, §5.2–5.3.*

## What it does today

### Dancers (on the Stage screen: `DancerPanel`)
- Lists the dancers with a count in the heading. **Add** by name (Enter or Add; blank is ignored): a new dancer gets a starting spot in a loose row across the front, in every formation, and **starts with no part** (a gray dot, flagged as a gap).
- **Rename** inline; **remove** with ✕ (removed from every formation and every assignment; clears the selection if selected).
- Clicking a row selects the dancer (ringed on the stage); clicking again deselects.
- Each row's dot shows the dancer's **part at the formation being edited** (named for screen readers: "Part A" / "No part").

### Parts (`PartsEditor`)
- A part is a name + a colour from a fixed 8-colour palette (blue, red, green, orange, sky blue, pink, yellow, gray: colour-blind safe). A new project starts with **Part A**.
- **+ Add part** gives the next free letter and the next unused colour; up to 8 parts (one per colour), then the button is disabled and says why. Rename and recolour inline. Several parts can't share a colour by default, but you can choose one that is in use.
- **Remove** a part: if anyone is assigned to it you are asked first ("N assignments will be cleared"); those dancers become unassigned and are flagged.

### Sections (`SectionsEditor`)
- A section is a stretch of the song (Intro, Verse 1, Chorus...). **Sections are contiguous**: each runs from its start count until the next section starts, and the first always starts at Set 1 · Count 1 and can't be moved. So every count is in exactly one section and there are no gaps or overlaps.
- **+ Add section** adds one two sets after the last, named "Section N", **copying the previous section's assignments** (like new formations copy the previous one). Set a later section's start with the Set/Count fields (counts stay unique and in order; moving one past another re-sorts them). Rename inline. The last remaining section can't be removed; removing a section deletes its assignments and the next section stretches back to cover it.

### Assignments (`AssignmentGrid`)
- A table: dancers down the side, sections across the top (each headed by its name and start). Each cell is a dropdown with every part plus "No part", with a colour swatch. A dancer can be in a different part in each section (dancers switch choreography mid-song).
- **Gaps**: a cell with no part (never assigned, cleared, or its part was removed) is outlined in red, counted in a status line ("2 missing assignments" / "Everyone has a part in every section."), and listed by name ("Maya has no part in Verse 1").
- On narrow screens the grid scrolls sideways inside its own box, and the first column (dancer names) stays in view.
- With no dancers, it links back to the Stage tab to add some.

### On the stage
- Each dot is filled with the dancer's part colour **for the section the stage is currently in** (it changes as you move to a formation in another section, or glide across a section boundary). Unassigned dancers are neutral gray. Initials switch between black and white for readability. The selected dancer gets a ring rather than a colour change, so their part stays visible.
- A legend at the top right of the stage shows the current section and every part with its colour.

## Not yet built

Drag-to-fill across a row and other bulk editing (plan §5.3, for larger screens); a vertical per-dancer list as the phone default for the grid (plan §6.3); a "show only Part X" filter on the stage (deferred until the timeline exists); parts on the timeline; videos and notes attached to a part (build-order step 4); the Overview "problems" list (step 5, which will reuse `findGaps`); roster library; dancer logins.

## Tests

`src/model/parts.test.ts` (section/part lookup, ordering, gaps), `src/lib/color.test.ts`, `src/store/partsSlice.test.ts`, `CastPage.test.tsx`, `PartLegend.test.tsx`, `DancerPanel.test.tsx`, migration + fixture tests for saved-data v2, and `e2e/cast.spec.ts` (including reading real dot colours from the canvas in both themes, mid-song colour changes, upgrading a v1 project, and phone layout).
