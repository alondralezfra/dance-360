# Overview

*Code: `src/features/overview/` (screen), `src/model/problems.ts` (the checks). Route: `/projects/:id/overview` (the **Overview** tab, first in the row). Plan: §5.2. Decision: [0030](../decisions/0030-overview-problems-derived.md).*

## What it does today

- **Summary**: the song's name (or "None yet"), and the number of dancers, formations and sections.
- **Problems**: a list worked out from the project each time (nothing is saved, so fixing something clears its problem straight away). Each problem is a link, with the people involved underneath (the first six names, then "and N more"; a blank name shows as "Unnamed"):
  - **"3 dancers have no part in Verse"**: dancers who have to be put in a part in that section (two or more parts apply there) and have not been. It is the same rule as the warnings on Cast & Parts (`findGaps`), so a project with no parts, or one part, or a section no part applies to, shows nothing here. Choosing it opens **Cast & Parts**.
  - **"Formation 7 has 11 of 12 dancers placed"**: a formation with no dot for some dancer in the cast. Choosing it opens the **Stage** with that formation selected.
  - Section problems come first, in song order, then formations in count order.
- With nothing wrong it says "No problems: every dancer has a part in each section and is placed in every formation."
- A project still **opens on Stage**; Overview is a tab you choose. On a phone it is the first tab of the bottom bar.

## Not built yet
- More checks: no song, a song file that is not on this device, no tempo, formations that overlap or run past the end of the song.
- Dismissing a problem that is deliberate (it would need saving, see the decision record), a performance date and quick links (plan §5.2).

## Tests
`src/model/problems.test.ts`, `Overview.test.tsx`, `e2e/overview.spec.ts` (summary, a no-part problem that links to Cast & Parts and clears when fixed, direct address and reload, phone layout), and the Overview in `e2e/accessibility.spec.ts`.
