# Cast & Parts

*Code: `src/features/cast/`. Routes: the dancer list is part of the Stage screen; parts, sections and the assignment grid are at `/projects/:id/cast` (the **Cast & Parts** tab). Plan: §2, §3.5, §5.2–5.3.*

## What it does today

### Dancers (on the Stage screen: `DancerPanel`)
- Lists the dancers with a count in the heading. **Add** by name (Enter or Add; blank is ignored): a new dancer gets a starting spot in a loose row across the front, in every formation. They start in whatever part applies: with one part (the default) they're in it automatically; where several parts apply they **start with no part** (a gray dot, flagged until you pick).
- **Rename** inline; **remove** with ✕ (removed from every formation and every assignment; clears the selection if selected).
- Clicking a row selects the dancer (ringed on the stage); clicking again deselects.
- Each row's dot shows the dancer's **part at the formation being edited** (named for screen readers: the part's name, "No part" where a choice is missing, or "Everyone" where no part applies).

### Parts (`PartsEditor`)
- A part is a name + a colour from a fixed 8-colour palette (blue, red, green, orange, sky blue, pink, yellow, gray: colour-blind safe). A new project starts with one part, **Everyone**, covering all sections: the uniform base that parts like Floor and Standing override in the sections where the dance splits. (You can rename or limit it like any part; projects made before this keep the part names they already had.)
- **+ Add part** gives the next free letter and the next unused colour; up to 8 parts (one per colour), then the button is disabled and says why. Rename and recolour inline. Several parts can't share a colour by default, but you can choose one that is in use.
- **Sections dropdown** (next to the colour): which sections the part applies to. It shows **All sections** (the default; includes sections added later), **No sections**, or the chosen section names in song order. Opening it shows an "All sections" checkbox and one checkbox per section, so any combination works (they needn't be neighbours). Ticking a section while on "All sections" narrows it to just that one; unticking the last ticked section goes back to "All sections"; "All sections" resets it. Works by keyboard (Enter opens, Space ticks, Escape closes and returns focus) and by touch.
- **How limiting works**: in a section, the parts limited to that section **replace** the all-sections parts. E.g. Part A (all sections) + Floor and Standing (limited to Chorus 1 and Chorus 2): the choruses offer only Floor and Standing; every other section has only Part A. If **exactly one part applies in a section, everyone is in it automatically**: there is nothing to pick there and it never shows a "missing assignment". That is also true of a one-part project (a brand-new project: everyone is in Everyone). If **no part applies** in a section (say Floor and Standing are both only in Verse 1, so the Chorus has none), that is **not an error**: the dance isn't split there, so everyone just dances together. Nothing is flagged and there is nothing to pick. Where two or more parts apply, each dancer has to be put in one.
- A new section keeps the parts of the section before it (add Chorus 3 straight after Chorus 2 and Floor/Standing apply there too). Removing a section removes it from every part that listed it; a part left with no sections applies nowhere ("No sections", highlighted) rather than silently becoming "all sections".
- **Remove** a part: if anyone is assigned to it you are asked first ("N assignments will be cleared"); those dancers become unassigned and are flagged (unless only one part is then left in that section, which takes everyone automatically).

### Sections (`SectionsEditor`)
- A section is a stretch of the song (Intro, Verse 1, Chorus...). **Sections are contiguous**: each runs from its start count until the next section starts, and the first always starts at Set 1 · Count 1 and can't be moved. So every count is in exactly one section and there are no gaps or overlaps.
- **+ Add section** adds one two sets after the last, named "Section N", **copying the previous section's assignments** (like new formations copy the previous one). Set a later section's start with the Set/Count fields (counts stay unique and in order; moving one past another re-sorts them). Rename inline. The last remaining section can't be removed; removing a section deletes its assignments and the next section stretches back to cover it.

### Assignments (`AssignmentGrid`)
- A table: dancers down the side, sections across the top (each headed by its name and start). A dancer can be in a different part in each section (dancers switch choreography mid-song).
- Where **no part applies** in a section, the cell reads **Everyone** (neutral gray swatch, read-only, with a tooltip saying why).
- Where **only one part applies** in a section, the cell just shows that part (swatch and name, read-only, with a tooltip saying why). Where **several apply**, the cell is a dropdown offering "No part" and **only the parts that apply in that section**.
- Choices are only accepted for parts that apply in that section. A choice for a part that stops applying there (its sections were narrowed) is kept but ignored, and comes back if the part is widened again.
- **Gaps**: only a cell that needs a choice (two or more parts apply there) and has none (never assigned, cleared, or its part was removed or no longer applies) is a gap. It is outlined in red, counted in a status line ("2 missing assignments" / "No missing assignments."), and listed by name ("Maya has no part in Verse 1"). Sections with one part or none never produce gaps.
- On narrow screens the grid scrolls sideways inside its own box, and the first column (dancer names) stays in view.
- With no dancers, it links back to the Stage tab to add some.

### On the stage
- Each dot is filled with the dancer's part colour **for the section the stage is currently in** (it changes as you move to a formation in another section, or glide across a section boundary). Unassigned dancers are neutral gray. Initials switch between black and white for readability. The selected dancer gets a ring rather than a colour change, so their part stays visible.
- A legend at the top right of the stage shows the current section and the parts that apply in it, with their colours. Where no part applies it shows a gray **Everyone** chip, matching the neutral dots.

## Not yet built

Drag-to-fill across a row and other bulk editing (plan §5.3, for larger screens); a vertical per-dancer list as the phone default for the grid (plan §6.3); a "show only Part X" filter on the stage (deferred until the timeline exists); parts on the timeline; videos and notes attached to a part (build-order step 4); the Overview "problems" list (step 5, which will reuse `findGaps`); roster library; dancer logins.

## Tests

`src/model/parts.test.ts` (section/part lookup, which parts apply, effective part, ordering, gaps), `src/lib/color.test.ts`, `src/store/partsSlice.test.ts`, `CastPage.test.tsx`, `SectionScope.test.tsx` (the sections dropdown and the grid with limited parts), `PartLegend.test.tsx`, `DancerPanel.test.tsx`, migration + fixture tests for saved-data v2 and v3, `e2e/cast.spec.ts` (including reading real dot colours from the canvas in both themes, mid-song colour changes, upgrading a v1 project, and phone layout) and `e2e/part-sections.spec.ts` (the choruses-only scenario end to end, stage colours and legend per section, upgrading a v2 project, keyboard and phone use of the dropdown).
