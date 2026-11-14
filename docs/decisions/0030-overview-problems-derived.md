# 0030. The Overview's problems are derived, not saved

- Status: Accepted
- Date: 2026-11-14

## Context
Build-order step 5 adds a list of problems to a new Overview tab (plan §5.2): dancers with no part in a section, formations that leave a dancer out. We had to decide whether a problem is stored (so it could be dismissed as "intentional") or worked out each time.

## Decision
`findProblems` in `src/model/problems.ts` is a pure function of the project, called when the Overview renders. Nothing about problems is saved and a problem cannot be dismissed. The "no part" rule is not repeated: it groups the gaps from `findGaps` (`model/parts.ts`), which the Cast & Parts warnings already use. A section where fewer than two parts apply never produces a problem (everyone is in the one part, or the dance is not split there).

## Consequences
- No data version bump, migration or fixture; a fix anywhere in the app clears its problem immediately, and the list can never be stale.
- A deliberate gap (a dancer who sits out a section on purpose) keeps showing. If that becomes annoying, add dismissing then: it would be a saved list of dismissed problems (a data version change) keyed by what the problem is about, not by its wording.
- New checks (song missing or not on this device, no tempo, formations out of order) are one more case in `findProblems` and one more link target.
- The screen needs a link target per kind of problem; `Problem` is a union so adding a kind makes the screen fail to compile until it handles it.
