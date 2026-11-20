# 0033. Phone Stage: a shorter formation bar

- Status: Accepted
- Date: 2026-11-19

## Context
Step 6 (responsive and mobile refinements), slice 2. At 390px the play bar was already two rows, but the formation controls under it took five more (name, Set/Count, Travel counts, New/Delete, chips), about 370px of the bar in all, so the stage was a small box. Plan §6.2 wants the phone to be stage-first, with edit tools out of the way. The choices were made with the project owner; the full Watch/Edit modes and a bottom sheet of the plan were left for later.

## Decision
- **Below 768px (where the Dancers drawer already replaces the sidebar) the bar keeps**: the play bar, the formation name row (previous, name, next, "1 of N"), the chips with **+ New formation** beside them (building stays one tap away), and a **Formation details** button. **Set, Count, Travel counts and Delete** are under that button, closed until asked for. From 768px up all of it is in view, unchanged.
- **One set of controls, placed by CSS.** `FormationStrip` is one wrapping row whose items are ordered with `order-*` per breakpoint, and the details wrapper uses `display: contents` from md up so its children join the desktop row. The alternative, two copies of the markup with one hidden, would put two buttons of the same name in the page. The details are hidden with `hidden`, so they are not reachable by keyboard or screen reader while closed.
- The open/closed state is local to the strip (not stored, not remembered): it is a convenience, and closed is the right start for a phone.

## Consequences
- Setting a formation's timing by typing, and Delete, take one more tap on a phone. Tap-to-snap (Mark on the play bar) is the phone's main way to time formations and is not behind the button.
- The "1 of N" text stays: a test and screen-reader users rely on it.
- A flex trap to remember: `md:flex-none` (a `flex` shorthand) resets the basis a `md:basis-full` set, so the strip uses `grow-0` instead.
