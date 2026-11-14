# Decision records

Short notes capturing **why** a significant technical choice was made, so it isn't re-litigated or silently undone. Add one whenever you pick a library, a data shape, a pattern, or a workflow rule that future changes must respect.

- Number them in order (`0007-...md`), keep them to about a page, and use the template below.
- **Never rewrite history.** If a decision changes, add a new record and set the old one's status to `Superseded by 00NN`.

```markdown
# 00NN. Title

- Status: Accepted | Superseded by 00NN
- Date: YYYY-MM-DD

## Context
What problem, what constraints.

## Decision
What we chose (one or two sentences).

## Consequences
What becomes easier, what becomes harder, what to watch for. Alternatives considered.
```

| # | Decision |
|---|---|
| [0001](0001-tech-stack.md) | Tech stack |
| [0002](0002-counts-are-the-source-of-truth.md) | Counts, not seconds, are the source of truth |
| [0003](0003-playback-is-a-pure-function.md) | Playback is a pure function |
| [0004](0004-versioned-persistence-behind-a-repository.md) | Versioned persistence behind a repository |
| [0005](0005-theme-tokens.md) | Theme tokens instead of raw colours |
| [0006](0006-verification-workflow.md) | Verification workflow: nothing is done until `verify` passes |
| [0007](0007-parts-sections-and-assignments.md) | Parts, sections and assignments (per-section parts, contiguous sections, palette-id colours) |
| [0008](0008-parts-limited-to-sections.md) | Parts limited to specific sections (one part = automatic, limited parts replace all-section parts) |
| [0009](0009-uncovered-sections-and-default-part.md) | Sections no part applies in are not an error; the default part is "Everyone" |
| [0010](0010-reordering-formations-and-collapsible-panels.md) | Reordering formations (timing slots stay put), collapsible panels, per-device preferences, `@dnd-kit` |
| [0011](0011-component-based-ui.md) | Component-based UI: build controls once (Icon, IconButton, Checkbox, field style), reuse, enforced by a test |
| [0012](0012-undo-redo-as-snapshots.md) | Undo/redo as project snapshots (session only, 100 steps, recorded by watching the store) |
| [0013](0013-audio-and-timeline-architecture.md) | Audio and timeline design: whole counts, one BPM (shaped for changes), IndexedDB audio + re-attach, `audio/` layer, tap-to-snap + metronome first |
| [0014](0014-canvas-performance.md) | Canvas performance: dot motion outside React via a playhead clock, no dot shadows (40 dancers at 60fps on a ~4x slower CPU) |
| [0015](0015-cloud-storage-and-sync.md) | Cloud storage and sync: local-first, conflicts ask (use theirs / keep mine as copy), one director first; repository prepared (RecordStore, sync bookkeeping, tombstones, contract tests) |
| [0016](0016-single-repository-modular-monolith.md) | One repository, modular inside; where server-side pieces go, and the triggers for splitting later |
| [0017](0017-song-tab-and-audio-storage.md) | The Song tab and song storage: IndexedDB by file hash, audio/ analysis at 8 kHz, peaks as derived data, missing-file flow, clearing unused files |
| [0018](0018-tempo-estimate.md) | Estimating a song's tempo and first beat: banded onset curve, coarse then fine search, confidence, no library; fills in only an untouched tempo |
| [0019](0019-playback-and-the-shared-playhead.md) | Playing the song: one shared playhead driven by the audio, the stage and timeline follow it, metronome, Space, no latency compensation yet |
| [0020](0020-tap-to-snap-markers-and-speaker-delay.md) | Placing formations on the song: Mark taps re-time the next formation (one undo step per take), draggable timeline markers, a per-device speaker delay with tap-along calibration |
| [0021](0021-project-backup-files-and-the-error-screen.md) | Backing a project up as a file (no audio; import is always a new copy) and the error screen with a download button |
| [0022](0022-dependency-audit-updates-and-secret-scanning.md) | Dependency audit (blocks on app libraries, warns on tools), weekly Dependabot, gitleaks in CI plus GitHub push protection |
| [0023](0023-accessibility-checks-and-readable-colours.md) | An axe accessibility scan in the e2e suite (WCAG 2.1 A/AA, every screen, both themes, desktop and phone, any violation fails) and colour roles with a contrast test |
| [0024](0024-repo-health-checks.md) | Repo health checks: file size limits (400 / 900 lines), unused code (`knip`), duplicated code and docs (`jscpd`), docs that name real files; all hard-fail in `verify` |
| [0025](0025-setup-check.md) | A setup check (`npm run doctor`, report only, on demand), the Node version written once in `engines.node`, a pre-hosting release checklist, and the lockfile-on-Windows lesson |
| [0026](0026-ui-styling-skill-and-screenshots.md) | A `ui-styling` project skill, `npm run screenshots` (phone and desktop, light and dark), and a written style guide derived from the current UI |
| [0027](0027-resources-links.md) | Resources, slice 1: links with a type tag, attached to a section and/or part; nothing fetched or embedded; http/https only; one Resources tab for Links and Notes; phone tabs scroll sideways |
| [0028](0028-notes.md) | Resources, slice 2: notes with one anchor (whole dance, a section, or one count) plus an optional part; one count not a range; shown on the Resources tab only for now; typing in notes and link titles is one undo step |
