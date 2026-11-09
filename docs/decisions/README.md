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
