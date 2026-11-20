# 0032. Phone and tablet navigation: a bottom tab bar

- Status: Accepted (supersedes the "phone tab row" section of [0027](0027-resources-links.md))
- Date: 2026-11-19

## Context
Step 6 of the build order (responsive and mobile refinements) starts with navigation. Plan §6.1 puts a bottom tab bar on phones. The five project tabs had outgrown the phone header: since decision 0027 they scrolled sideways beside Undo/Redo, the project name was squeezed to about 80px ("Untitled danc…"), and the tabs were at the top of the screen, out of thumb reach. The scope was agreed with the project owner: polish the existing phone layout (not the plan's full stage-first Watch mode), add the bottom bar, then give the Stage a compact play bar, in separate slices; and check at 390px, 360px and 768px wide.

## Decision
- **The section tabs are a fixed bar along the bottom edge** (the `tabbar` variant in `index.css`) **below 832px, and below 1024px unless the window is short**: five equal tabs, an icon above each label, the open one marked by a line above it (and `aria-current`). Otherwise they stay in the header as before. The line is not 768px because the five inline tabs, Undo/Redo, the save status and the theme toggle need about 820px: at 768px (an iPad held upright) they wrapped onto a second row. Plan §6.1 gives the tablet the same compact navigation. It is the same `nav` and the same links, so nothing that finds a tab by name changes.
- **Below 640px the header is two rows**: the app link, save status and theme toggle, then the project name (the full width minus Undo/Redo) with Undo/Redo. The breadcrumb `nav` uses `display: contents` there so its children can join the header's rows. From 640px it is one row (the name box is wider than it was, 8rem).
- **A short window (under 32rem tall) keeps the tabs in the header as soon as they fit (832px), and otherwise gets a compact bar** (icon beside label, 40px tall). Short windows are a phone held sideways and a laptop at 150% to 200% browser zoom (911 by 512 and 683 by 384 CSS pixels). A bar there took too much of the height: the zoom checks that the stage keeps its share of the screen failed. `short` is a custom variant in `index.css`.
- **The page keeps clear of the bar** with bottom padding on the workspace (`3.5rem` plus the device's safe-area inset), so screens need no knowledge of it. Drawers and dialogs sit above the bar.
- **Icons** (`overview`, `stage`, `cast`, `song`, `link`) are added to the shared `Icon` set. The active tab uses the foreground colour and a `primary` line, never `text-primary` (colour roles, decision 0023).

## Consequences
- The sideways-scrolling row, its scroll-into-view effect and the helper and tests that checked it are gone.
- Every tab is one tap away with the thumb; the project name can be read and edited on a phone.
- A sixth tab (the plan lists Schedule, Outfits, Settings) would make each tab 20% narrower on a 360px phone; at that point a "More" tab is the likely answer.
- Not chosen: keeping the scrolling row (tabs out of reach, name squeezed); moving only Undo/Redo (still not thumb reach, name still short).
