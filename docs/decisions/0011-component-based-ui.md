# 0011. Component-based UI: build controls once, reuse them

- Status: Accepted
- Date: 2026-11-09

## Context
The project owner asked for a modular, component-based architecture while the codebase is small. An audit found a good base (`Button`, `Input`, `Select`, `NumberField`, `Popover`, `Drawer`) but real duplication: icons were text symbols (`✕` copied in four places, `◀ ▶ ▲ ▼ ▾ ☀ ☾ ›` elsewhere, which render differently per font), the "remove" button was copy-pasted with the same props four times, the field look was pasted into `Input`, `Select` and the section dropdown's trigger, and there were raw `<input>`/`<button>`/checkbox elements in screens (the formation chips, the dancer-name field, two checkboxes) that re-implemented styling and selected state.

## Decision
- Add the **fewest** new pieces that remove that duplication: `Icon` (one inline-SVG set), `IconButton` (icon + required label), `Checkbox` (box + label row), `fieldClass` (the shared field look), and two variants on existing components (`Button` `chip`, `Input` `inline`). Everything else stays as it was.
- **Rules going forward** (written into `docs/components.md` and `CLAUDE.md`): reuse first; extend an existing component with a variant before creating one; add a component only when a pattern appears a second time or has accessibility rules worth solving once; components live in `components/ui/`, know nothing about the app, use theme tokens, take `className` and standard props, and have a test and a catalog row.
- **Enforced** by `src/architecture.test.ts`: screens may not contain raw `<button>`, `<input>`, `<select>`, `<textarea>` or `<svg>`, or text-symbol icons.
- Icons are a small hand-kept set of outlines, not an icon library, to avoid a dependency for seven shapes. If the set grows large, switching `Icon`'s internals to a library changes one file.
- Selected state on chips is styled from `aria-pressed`, so appearance and what assistive technology reports can't diverge.

## Consequences
- A restyle (corner radius, focus ring, button height) is a one-file change; adding a screen needs no new CSS for standard controls.
- New patterns need a tiny bit of up-front work (a variant or prop), which is the point.
- Not done on purpose: no full design-system package, no Storybook, no pre-built components "we might need". Extract on the second use.
- The dancer rows and project-name field are now 40px tall (inline `Input`), which also meets the touch-target rule they previously missed.
