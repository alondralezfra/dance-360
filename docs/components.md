# Shared components

*Code: `src/components/ui/`. Last verified against the code: 2026-11-13.*

Every control in the app is built **once** here and reused. A screen never styles its own button, input, checkbox or icon; it picks one of these. That keeps the app visually consistent, makes a restyle a one-file change, and keeps accessibility (names, focus, touch size) solved in one place. Decision: [0011](decisions/0011-component-based-ui.md). Enforced in part by `src/architecture.test.ts` (no raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<svg>` or text-symbol icons outside `components/ui/`).

## Catalog

| Component | Use it for | Notes |
|---|---|---|
| `Button` | Any text button | `variant`: `primary`, `secondary` (default), `ghost`, `danger`, `danger-ghost`, `chip` (a selectable item: styled by `aria-pressed`). `size`: `md`, `icon`. 40px minimum height. For something that must look like a Button but is a link (one that opens in a new tab), call `buttonVariants({ variant })` (`buttonVariants.ts`) on the `<a>`; never copy the class string. |
| `IconButton` | A button that is only an icon (remove, previous/next, show/hide, theme) | `icon` + **required** `label` (its accessible name and tooltip). Takes every `Button` variant. |
| `Icon` | A symbol next to text or inside a button | One inline-SVG set (`close`, `chevronLeft/Right/Up/Down`, `sun`, `moon`, `undo`, `redo`, `plus`, `minus`, `play`, `pause`, `flag`, `download`, `externalLink`); inherits text colour; decorative (`aria-hidden`). Add icons in `Icon.tsx`. |
| `Input` | Text entry | `variant`: `default`, `inline` (looks like text until hovered/focused: names edited in place). |
| `NumberField` | A labelled number field that commits on blur/Enter and reverts bad entries | Built on `Input`. Whole numbers unless `decimals` is set (e.g. a 127.5 BPM). |
| `Select` | A native dropdown | |
| `Slider` | A draggable value (a playback position) | `label` (required: its accessible name), `value`, `min`, `max`, `step`, `onChange(number)`, `valueText` for screen readers. 40px tall; arrow keys, Home and End work. |
| `Checkbox` | A checkbox with its label as one 40px row | `children` is the label. |
| `FileButton` | A button that opens the device's file picker | The real file input is hidden and driven by the button. `accept` filters; `onFile` gets the chosen file (and the same file can be chosen again). Takes every `Button` variant. |
| `SectionHeader` | The title of a screen section, with a line of explanation and action buttons | `id` (for `aria-labelledby`), `title`, `children` (the explanation), `actions`. Used by every section on the Cast and Song tabs. |
| `Popover` (+ `PopoverTrigger`, `PopoverContent`) | A small floating panel | Radix. Style a trigger with `fieldClass` when it should look like a field. |
| `Drawer` | A slide-over panel (phone version of a sidebar) | Radix dialog. |
| `fieldClass` (`field.ts`) | The shared look of text-like controls | Compose it (`cn(fieldClass, ...)`); never copy the string. |
| `ThemeToggle` (`components/`) | The light/dark switch | |

Feature-specific pieces that more than one screen could want (like `PartSwatch`) live in their feature folder until a second feature needs them, then move up here.

## How the app looks (the conventions already in the UI)

What the screens do today, so a new one matches. These are observed from the components and screens, not new rules; if a screen needs to differ, change the convention here in the same change. Colour *roles* are a rule, in [architecture.md](architecture.md) rule 7. To see the screens, run `npm run screenshots` (below).

- **Page frame.** The Cast & Parts, Song and Resources tabs are one centred column (`max-w-5xl`, `p-4`) of sections `gap-8` apart; the projects home is narrower (`max-w-3xl`). The stage is full width: a dancer sidebar, the canvas, and a bottom bar. On a phone the sidebar becomes a drawer and the tabs get their own row, which scrolls sideways when they do not all fit.
- **Type.** Almost everything is `text-sm`. A section title is `text-lg font-semibold` with a `text-sm` muted line under it (`SectionHeader`); a screen title is `text-xl font-semibold`; a small panel label is `text-xs font-semibold uppercase tracking-wider text-muted-foreground`; hints and captions are `text-xs`. Emphasis is weight (`font-medium`, `font-semibold`) or the muted/foreground colour, not extra sizes.
- **Surfaces.** The page is `bg-background`; blocks sit on `bg-surface` with a 1px `border-border` and `rounded-lg`. Controls are `rounded-md` with `border-border-strong` (`fieldClass`, `Button`); pills are `rounded-full`. Shadows are only for things that float (`Popover`, `Drawer`), never for cards.
- **Rows and cards.** A list row (a part, a section, a link, a project) is `rounded-lg border border-border bg-surface` with `p-2` (editor rows) or `p-3` (project cards); a row with many fields (a link) wraps them, and on a phone puts the title and its main buttons on the first line, controls inside separated by `gap-2`. An empty list is a dashed box (`border-dashed border-border-strong p-4`, muted text; `p-8` and centred on the projects home).
- **Messages.** A tinted block, `rounded-lg p-3 text-sm`: information on `bg-primary-soft` with `text-primary-soft-foreground`, an error on `bg-danger-soft` with `text-danger` (a blocking one adds `border-danger`), something needing attention on `bg-selected-soft`.
- **Spacing.** `gap-2` between controls in a row, `gap-3` between a header and its buttons, `mt-3` from a header to its content, `gap-8` between page sections. Rows are `flex-wrap`, so they reflow on a phone instead of scrolling sideways.
- **Emphasis and colour.** Indigo (`primary`) is the action colour, and each section has at most one primary `Button` (the main action: "+ Add part", "+ New formation", "Play"); everything else is secondary, ghost or chip. Add actions are labelled with a leading "+". Danger styling appears on hover for destructive buttons. Amber (`selected`) marks the selected dancer or row. Part colours (`--part-*`) mean a part and are never decoration.
- **Controls.** At least 40px tall and wide, labelled, and a visible focus ring (see the rules below).

### Looking at it

`npm run screenshots` builds the app and photographs the projects home, stage, cast, song (empty and with a song), resources (empty and with links) and, on a phone, the dancer drawer, at 390px and 1280px wide in the light and dark themes (`e2e/ui.shots.ts`, config `playwright.screenshots.config.ts`). The whole-page pictures go to `screenshots` (git-ignored; `SCREENSHOT_DIR` changes where) and replace earlier ones of the same name. It takes about 15 seconds, is not part of `npm run verify`, and is how the `ui-styling` skill (`.claude/skills/ui-styling/SKILL.md`) looks at a change. A new screen worth photographing is added to `e2e/ui.shots.ts`.

## Rules for building UI (also in CLAUDE.md)

1. **Reuse first.** Before writing markup with classes, look at the catalog. Need something slightly different? Add a **variant or prop** to the existing component, not a new component or a one-off class string.
2. **Add a component only when a pattern appears a second time**, or when a primitive has accessibility rules worth solving once (like a labelled icon button). One-off layout stays in the screen. Keep the number of components small.
3. **Text colours have roles** ([decisions/0023](decisions/0023-accessibility-checks-and-readable-colours.md)): `text-foreground`, `text-muted-foreground`, `text-link` for text; `text-subtle-foreground` only for icons and decoration; never `text-primary`. Label controls so the accessible name contains the visible text.
3. **A new component** goes in `components/ui/`, takes `className` (merged with `cn`) and standard element props (`ComponentProps<'button'>`), uses only theme tokens, has a test (role/name, states, disabled) and a row in the table above.
4. **Accessibility is part of the component**, not each caller: required labels for icon-only controls, `aria-pressed`/`aria-expanded` for toggles, 40px touch targets, visible focus.
5. **Style state with attributes** where one exists (`aria-pressed:`, `disabled:`), so the look can't disagree with what assistive technology hears.
6. **Don't use text symbols as icons** (✕ ◀ ▾): they change with the font and can't be sized or recoloured reliably. Use `Icon`.
7. **Components don't know about the app.** Nothing in `components/ui/` imports a store, `model/` or a feature; data and behaviour arrive as props.
