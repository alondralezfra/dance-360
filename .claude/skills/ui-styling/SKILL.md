---
name: ui-styling
description: Build or restyle a Dance 360 screen or component so it matches the app. Use for any change to what the UI looks like or how a screen is laid out (new screen, new control, spacing, colours, dark mode, phone layout, "make it look right"). Reads the project's own conventions, then checks the result in screenshots.
---

# Styling Dance 360 UI

The rules and conventions live in the docs; this skill is the order to apply them in and how to check the result. Do not copy rules from the docs into your answer or into new files: link to them.

## 1. Read first (every time, they change)

- [docs/components.md](../../../docs/components.md): the component catalog, **"How the app looks"** (sizes, spacing, surfaces, messages, emphasis) and the rules for building UI.
- [docs/architecture.md](../../../docs/architecture.md) rules 7 to 9: theme tokens and colour roles, reuse `components/ui/`, touch first.
- `src/index.css` for the available tokens (both themes); `src/components/ui/` for what already exists.
- The existing screen closest to what you are building, and copy its structure.

## 2. Build with what exists

- Use the catalog components. Different need: add a **variant or prop** to the existing one. A new component only when a pattern appears a second time (then add its test and a catalog row).
- Theme tokens only (`bg-surface`, `text-muted-foreground`...), never hex or palette colours; a new canvas colour needs a token. Colour roles are strict (rule 7).
- No raw `<button>`, `<input>`, `<select>`, `<svg>` or text symbols as icons on screens (a test enforces it).
- Match the conventions in "How the app looks": one primary button per section, `text-sm` body, `rounded-lg` blocks with a `border-border` edge, `gap-2` / `gap-3` / `gap-8` spacing, rows that `flex-wrap`.
- 40px touch targets, labelled controls, nothing hover-only. If you change a screen's states, add it to the accessibility scan (see [docs/testing.md](../../../docs/testing.md)).

## 3. Look at it (do not skip: passing tests do not show how it looks)

1. Run `npm run screenshots` (about 15 seconds; needs `npm run doctor` to pass). It photographs the main screens at 390px and 1280px wide, in light and dark, into the `screenshots` folder (git-ignored).
2. Read the images that your change touches (the Read tool shows pictures). Compare at least one phone and one desktop picture, in both themes.
3. If your screen is not photographed, add it to `e2e/ui.shots.ts` and run again.
4. Look for: horizontal scroll or clipped content on the phone; text that is hard to read in either theme; controls under 40px; things misaligned with neighbouring screens; spacing or sizes that differ from the conventions; a second primary button; a colour used for decoration.
5. Fix, run `npm run screenshots` again, look again. Say what you looked at and what you changed.

## 4. Finish

- Update [docs/components.md](../../../docs/components.md) in the same change if you added a component or changed a convention (including the "Last verified" date).
- `npm run verify` must pass (the usual loop in [CLAUDE.md](../../../CLAUDE.md)).
- Report what the pictures showed, and anything you could not check (for example a real phone).
