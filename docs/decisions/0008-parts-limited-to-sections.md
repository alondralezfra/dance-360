# 0008. Parts limited to specific sections

- Status: Accepted (one assumption, "a section where no part applies leaves every dancer flagged", superseded by [0009](0009-uncovered-sections-and-default-part.md))
- Date: 2026-11-03
- Extends [0007](0007-parts-sections-and-assignments.md).

## Context
With 0007 every dancer had to be assigned a part in every section, so a song where most sections are "one uniform part" and only the choruses split into Floor and Standing showed a wall of "missing assignment" errors. The project owner wants to say "this Floor part is only in Chorus 1 and Chorus 2".

## Decision (decided with the project owner)
- **Data** (saved-data version 3): each part gains `sectionIds: Id[] | null`: the sections it applies to, or `null` for all sections (including ones added later). An empty list means it applies nowhere.
- **Picking**: a checklist dropdown next to the colour (an "All sections" box plus one per section), so any combination works. Chosen over from/to dropdowns (consecutive only) and a single section (would need duplicate parts).
- **One part = automatic**: in a section where exactly one part applies, everyone is in it automatically: no picking, no warnings, and the grid cell is read-only. (Rather than pre-filling editable cells, which would store values that go stale.)
- **Specific parts replace all-section parts**: in a section where any limited part applies, only the limited parts are offered; all-section parts apply everywhere no limited part does. So for the choruses example you don't also have to edit Part A. (Rather than offering both, which needs extra setup and more clicks.)
- **New section** keeps the previous section's parts (every part listing the previous section also lists the new one), matching how it already copies assignments.
- These rules live in two pure functions in `model/parts.ts`: `availableParts(parts, sectionId)` and `effectivePartId(parts, assignments, sectionId, dancerId)`; `partIdAt` and `findGaps` are built on them, so the stage, dancer list, legend, grid and (later) the Overview problems list all agree.

## Assumptions made without asking
- Unticking the last ticked section returns the part to "All sections" (an empty selection isn't reachable from the dropdown). The only way to get "No sections" is removing the last section a part listed, and it is then shown highlighted rather than turned into "all sections".
- Stored assignments are never deleted when a part is narrowed: choices for sections it no longer applies to are ignored, and come back if it is widened again (avoids losing work). Likewise a stored choice is ignored while exactly one part applies in the section.
- Only a part that applies in a section can be chosen there.
- A section where no part applies leaves every dancer flagged.
- The legend lists only the parts that apply in the current section.
- Existing projects migrate with every part on "All sections", so nothing changes for them. One visible change for everyone: a project with just one part (including a brand-new one) now puts everyone in it automatically instead of showing them as unassigned.

## Consequences
- Adds `@radix-ui/react-popover` (the same family as the drawer's dialog) for the dropdown.
- The grid has two kinds of cell (read-only vs dropdown). Anything that needs "who is in what part" must go through `effectivePartId`/`partIdAt`, never read `assignments` directly.
- Moving or deleting sections and parts has more cascades to keep consistent (covered by store tests): removing a section edits parts' `sectionIds`; adding one extends them.
