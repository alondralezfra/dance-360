# 0007. Parts, sections and assignments

- Status: Accepted
- Date: 2026-11-03
- Refines [0005](0005-theme-tokens.md): part colours turned out to be theme tokens after all (see Colours below).

## Context
Build-order step 2 (plan §3.5, §5.3): dancers switch choreography mid-song, so a dancer's part is per section, not per dancer. The stage must colour dots by part, and missing assignments must be flagged.

## Decision (decided with the project owner)
- **Data** (saved-data version 2): `parts[] {id, name, color}`, `sections[] {id, name, startCount}`, `assignments: sectionId -> dancerId -> partId`. A missing entry means "no part yet".
- **Sections are contiguous**: each starts where the previous ends, defined only by a start count; the first is pinned to count 0; at least one always exists. This makes "which section is this count in" total and removes gap/overlap validation. (Alternative rejected: explicit start and end, which allows a gap but needs extra UI and leaves a dancer's part undefined in it.)
- **Defaults**: a new section copies the previous section's assignments; a new dancer starts unassigned and is flagged (rather than blank everywhere, or auto-filled with the first part, which would hide mistakes).
- **Location**: a new **Cast & Parts** tab (`/projects/:id/cast`) with project tabs in the workspace header, rather than cramming the grid into the Stage sidebar.
- **Scope**: this step colours dots and shows a legend; the "show only Part X" stage filter is deferred.
- **Colours**: parts store a palette id (`blue`, `red`...), not a hex value. The 8 colours (Okabe-Ito, colour-blind safe) are CSS tokens `--part-<id>` in `src/index.css`, defined per theme, and read by the canvas through `useCanvasTheme`. So themes can retune them and old data never contains stale hex values. Initials are drawn black or white by contrast (`readableOn`).
- The selected dancer is shown with a ring instead of a colour change so the part colour is never hidden.

## Assumptions made without asking
New projects start with "Part A" and "Section 1"; the migration gives existing projects the same, with every existing dancer already in Part A (so nothing looks different or gets flagged after upgrading); at most 8 parts (one per palette colour); removing a used part asks first; each grid cell is a native dropdown (accessible, works on touch); drag-to-fill is deferred.

## Consequences
- Which part a dancer is in at any count is one pure lookup (`partIdAt`), usable by the stage, the dancer list and later playback and the dancer view.
- Deleting things cascades: removing a dancer clears their assignments; removing a part clears assignments to it (shown as gaps); removing a section deletes its assignments.
- Moving a section's start can reorder sections; counts are kept unique the same way as formation counts.
- Adding a data field means a migration, a fixture and tests ([0004](0004-versioned-persistence-behind-a-repository.md)); v1 -> v2 is the first real use of that flow.
