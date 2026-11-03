# Changelog

All notable changes. Newest first. Add an entry under **Unreleased** in the same change as the code (enforced by `npm run verify`); group by Added / Changed / Fixed / Removed, and mention data-format changes and migrations explicitly.

## Unreleased

### Added (parts, sections and assignments: build-order step 2)
- **Cast & Parts** tab with project tabs in the workspace header (Stage | Cast & Parts).
- **Parts**: colour-coded groups (name + one of 8 colour-blind-safe colours); add, rename, recolour, remove (asks first if dancers are assigned).
- **Sections**: contiguous stretches of the song defined by a start count; add (copies the previous section's assignments), rename, move, remove.
- **Assignment grid**: dancers by sections, each cell a dropdown of parts; missing assignments are outlined, counted and listed. Scrolls sideways on narrow screens.
- **Stage**: dots are coloured by the dancer's part in the current section (neutral gray if unassigned), with a legend showing the section and parts. The dancer list dots show the same colours.
- Select control; `model/parts.ts` (part/section/assignment logic) and `lib/color.ts` (readable initials).
- Tests: part/section logic, store, migration + fixture for data v2, Cast & Parts and legend components, and browser tests that read real dot colours from the canvas (both themes), mid-song colour changes, upgrading an old project, and phone layout.

### Changed
- The selected dancer on the stage is drawn with a ring instead of changing colour, so the part colour stays visible. Canvas colour tokens: `--dot`/`--dot-stroke`/`--dot-selected-stroke` replaced by `--dot-unassigned`, `--dot-outline`, and a ring-colour `--dot-selected`; new `--part-*` tokens.
- Buttons never wrap their label onto several lines.
- Header: the "Stage" breadcrumb segment was replaced by the tabs.

### Data format
- Saved-data **v2**: projects gain `parts`, `sections` and `assignments`. Existing projects are upgraded on open to one part ("Part A") and one section ("Section 1") with every dancer already in Part A, so they look the same as before. See `docs/decisions/0007-parts-sections-and-assignments.md`.

### Added (workflow)
- Verification workflow: `npm run verify` (change discipline, lint, tests + coverage, type-check + build, browser tests), a Claude Code Stop hook and a git pre-commit hook that enforce it, and `CLAUDE.md` describing the process. See `docs/decisions/0006-verification-workflow.md`.
- Test suite: component tests (dancer panel, formation strip, number field, theme, playhead, projects home), integration tests (repository, autosave, project loading), architecture-rule tests, saved-data fixtures, and 27 Playwright browser tests covering projects, the stage editor (including real drags), theme and phone layout.
- Documentation set in `docs/`: architecture, testing, per-feature docs, and decision records.
- GitHub Actions workflow (`.github/workflows/ci.yml`) running `npm run verify` on pushes to `main` and pull requests; `scripts/check-changes.mjs --base <ref>` checks a whole branch for tests, docs and changelog.
- `CLAUDE.md` workflow gained an "Ask first" step: before building anything non-trivial, ask the product questions that are the owner's to answer.

## 0.1.0 — 2026-11-03 (foundation)

### Added
- Projects home and `/projects/:id/stage` workspace (React Router); multiple projects.
- Formation timing: each formation has a `count` (Set/Count fields) and travel length; project has a tempo map. Pure playback engine `positionsAt(formations, count)`.
- Autosaving, versioned storage behind a `ProjectRepository` interface, with migrations. The old single-project save is imported automatically.
- Light/dark themes via semantic tokens; shared UI components (Button, Input, NumberField, Drawer).

### Changed
- State split into slices; saved project data separated from UI selection state.
- Code reorganised into `model/`, `persistence/`, `store/`, `features/`, `components/`, `theme/`.

### Data format
- Saved projects are now versioned. v0 (prototype) -> v1 adds `formations[].count`, `formations[].transitionCounts` and `tempo`.

## 0.0.0 — prototype
- Static formation editor: stage, dancers, formations, drag to place, glide between formations.
