# Changelog

All notable changes. Newest first. Add an entry under **Unreleased** in the same change as the code (enforced by `npm run verify`); group by Added / Changed / Fixed / Removed, and mention data-format changes and migrations explicitly.

## Unreleased

### Added
- Verification workflow: `npm run verify` (change discipline, lint, tests + coverage, type-check + build, browser tests), a Claude Code Stop hook and a git pre-commit hook that enforce it, and `CLAUDE.md` describing the process. See `docs/decisions/0006-verification-workflow.md`.
- Test suite: component tests (dancer panel, formation strip, number field, theme, playhead, projects home), integration tests (repository, autosave, project loading), architecture-rule tests, saved-data fixtures, and 27 Playwright browser tests covering projects, the stage editor (including real drags), theme and phone layout.
- Documentation set in `docs/`: architecture, testing, per-feature docs, and decision records.
- GitHub Actions workflow (`.github/workflows/ci.yml`) running `npm run verify` on pushes to `main` and pull requests; `scripts/check-changes.mjs --base <ref>` checks a whole branch for tests, docs and changelog.

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
