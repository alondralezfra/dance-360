# Dance 360

A workspace for dance directors: formations, cast, parts, music and resources in one place.
See [dance-director-app-plan.md](dance-director-app-plan.md) for the full product plan.

## Running it

```sh
npm install     # first time only
npm run dev     # then open http://localhost:5173
```

## Tech stack

React + TypeScript (Vite), Konva for the stage canvas, Zustand for state, Tailwind for styling.

## Project layout

- `src/model/` — data types and the project store (no UI code)
- `src/components/` — screens and UI pieces (stage canvas, dancer panel, formation strip)

## Progress (build order from the plan)

- [x] 1. Static formation editor (stage + dots + multiple formations)
- [ ] 2. Roster + parts + assignment grid, linked to dot colors
- [ ] 3. Audio + tempo map + timeline + playback
- [ ] 4. Resources + notes
- [ ] 5. Overview problem checks
- [ ] 6. Responsive/mobile refinements
