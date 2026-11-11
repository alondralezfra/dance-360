# Shared components

*Code: `src/components/ui/`. Last verified against the code: 2026-11-09.*

Every control in the app is built **once** here and reused. A screen never styles its own button, input, checkbox or icon; it picks one of these. That keeps the app visually consistent, makes a restyle a one-file change, and keeps accessibility (names, focus, touch size) solved in one place. Decision: [0011](decisions/0011-component-based-ui.md). Enforced in part by `src/architecture.test.ts` (no raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<svg>` or text-symbol icons outside `components/ui/`).

## Catalog

| Component | Use it for | Notes |
|---|---|---|
| `Button` | Any text button | `variant`: `primary`, `secondary` (default), `ghost`, `danger`, `danger-ghost`, `chip` (a selectable item: styled by `aria-pressed`). `size`: `md`, `icon`. 40px minimum height. |
| `IconButton` | A button that is only an icon (remove, previous/next, show/hide, theme) | `icon` + **required** `label` (its accessible name and tooltip). Takes every `Button` variant. |
| `Icon` | A symbol next to text or inside a button | One inline-SVG set (`close`, `chevronLeft/Right/Up/Down`, `sun`, `moon`, `undo`, `redo`, `plus`, `minus`, `play`, `pause`, `flag`, `download`); inherits text colour; decorative (`aria-hidden`). Add icons in `Icon.tsx`. |
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

## Rules for building UI (also in CLAUDE.md)

1. **Reuse first.** Before writing markup with classes, look at the catalog. Need something slightly different? Add a **variant or prop** to the existing component, not a new component or a one-off class string.
2. **Add a component only when a pattern appears a second time**, or when a primitive has accessibility rules worth solving once (like a labelled icon button). One-off layout stays in the screen. Keep the number of components small.
3. **Text colours have roles** ([decisions/0023](decisions/0023-accessibility-checks-and-readable-colours.md)): `text-foreground`, `text-muted-foreground`, `text-link` for text; `text-subtle-foreground` only for icons and decoration; never `text-primary`. Label controls so the accessible name contains the visible text.
3. **A new component** goes in `components/ui/`, takes `className` (merged with `cn`) and standard element props (`ComponentProps<'button'>`), uses only theme tokens, has a test (role/name, states, disabled) and a row in the table above.
4. **Accessibility is part of the component**, not each caller: required labels for icon-only controls, `aria-pressed`/`aria-expanded` for toggles, 40px touch targets, visible focus.
5. **Style state with attributes** where one exists (`aria-pressed:`, `disabled:`), so the look can't disagree with what assistive technology hears.
6. **Don't use text symbols as icons** (✕ ◀ ▾): they change with the font and can't be sized or recoloured reliably. Use `Icon`.
7. **Components don't know about the app.** Nothing in `components/ui/` imports a store, `model/` or a feature; data and behaviour arrive as props.
