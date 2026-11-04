# 0009. Uncovered sections are not an error; the default part is "Everyone"

- Status: Accepted
- Date: 2026-11-03
- Supersedes two assumptions in [0008](0008-parts-limited-to-sections.md) ("a section where no part applies leaves every dancer flagged") and in [0007](0007-parts-sections-and-assignments.md) (new projects start with "Part A").

## Context
After 0008 a user made Floor and Standing, put both in Verse 1, and left the Chorus with no part. The Chorus showed "2 missing assignments", but its cells only offered "No part": an error that couldn't be fixed from the grid and gave no reason. The only way out was to add a part covering every section. The cause was that the new-project default (an all-sections "Part A") looked like any other part, so it was easy to rename and limit it, leaving a section with nothing.

## Decision (decided with the project owner)
- **A section where no part applies is not an error.** The dance isn't split there, so everyone dances together. The grid cell reads **Everyone** (read-only, neutral gray swatch), dots are the neutral gray, the legend shows a gray "Everyone" chip, and nothing is flagged. You only define parts where the dance splits. As soon as a part covers the section it behaves normally (one part: automatic; several: pick).
- **A gap now means exactly one thing:** two or more parts apply in a section and a dancer hasn't been put in one. (`findGaps` skips sections with fewer than two applicable parts.)
- **New projects start with one part named "Everyone"** on all sections (still blue), instead of "Part A", so it reads as the uniform base that Floor and Standing override. The next part added is "Part A". Existing projects keep their part names (no migration, no data change).
- The grid's status line now reads **"No missing assignments."** instead of "Everyone has a part in every section.", which would be untrue in an uncovered section.
- Rejected: keeping the flag but adding an "Add a part for Chorus" button (stricter, but nags in songs that are uniform in places); a hidden built-in baseline part with its own colour (one more concept, and a part you can't edit).

## Consequences
- Removing every part, or limiting them all away from a section, quietly leaves everyone unassigned-but-fine there; a typo-level mistake (a section you meant to cover) is no longer called out. The Overview problems list (build-order step 5) is the place to surface "section X has no parts" as information if directors want it.
- Gray now means two things on the stage: "no part applies here" (fine) and "a choice is missing" (flagged on the Cast & Parts tab). The legend's "Everyone" chip disambiguates the first. If this proves confusing, give flagged dots a distinct outline.
- `isUncovered(parts, sectionId)` in `model/parts.ts` is the one place that decides "no part applies".
