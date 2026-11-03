# Cast (dancer roster)

*Code: `src/features/cast/`. Shown inside the Stage screen. Plan: §2, §5.2 (item 3).*

## What it does today

- Lists the project's dancers with a count in the heading.
- **Add** a dancer by name (Enter or the Add button; blank names are ignored). A new dancer gets a starting spot in a loose row across the front of the stage, **in every existing formation**.
- **Rename** inline by editing the name.
- **Remove** a dancer (the ✕ button); they are removed from every formation. Removing the selected dancer clears the selection.
- Clicking a row selects the dancer (highlighted on the stage); clicking again deselects.

## Not yet built

Parts and the assignment grid (build-order step 2), roster library across projects, dancer logins and the dancer view (plan §8).

## Tests

`DancerPanel.test.tsx`, roster tests in `src/store/projectStore.test.ts`, `e2e/stage.spec.ts`.
