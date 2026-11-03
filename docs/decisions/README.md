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
