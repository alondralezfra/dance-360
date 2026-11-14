# Dance 360

A workspace for dance directors: formations, cast, parts, music and resources in one place.
Product plan: [dance-director-app-plan.md](dance-director-app-plan.md). All other documentation: [docs/](docs/README.md).

## Running it

```sh
npm install     # first time only (also enables the git pre-commit hook)
npm run dev     # then open http://localhost:5173
npm run doctor  # if something does not work: checks Node 24+, installed packages, the git hook, a test browser, port 5199
```

## Checking a change

```sh
npm run verify        # the full gate: docs/tests check, lint, tests + coverage, build, browser tests
npm run verify:quick  # same without the browser tests, for iterating
```

A change isn't done until `npm run verify` passes. See [docs/testing.md](docs/testing.md).

## Where things are

- How the code is organised and its rules: [docs/architecture.md](docs/architecture.md)
- What each feature does today: [docs/features/](docs/features/)
- Why we chose things: [docs/decisions/](docs/decisions/)
- What changed: [CHANGELOG.md](CHANGELOG.md)
- How Claude works in this repo: [CLAUDE.md](CLAUDE.md)

## Progress (build order from the plan)

- [x] 0. Foundation: versioned persistence, playback engine, themed UI kit, routing, tests
- [x] 1. Static formation editor (stage + dots + multiple formations, with timing in counts)
- [x] 2. Roster + parts + assignment grid, linked to dot colors
- [x] 3. Audio + tempo map + timeline + playback *(data model, the Song tab with audio storage, waveform and timeline, tempo/first-beat estimation, playback with a metronome, tap-to-snap, draggable markers and speaker-delay calibration)*
- [ ] 4. Resources + notes
- [ ] 5. Overview problem checks
- [ ] 6. Responsive/mobile refinements
