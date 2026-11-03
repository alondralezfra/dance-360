# Documentation

Living documentation for Dance 360. It is updated in the **same change** as the code it describes (enforced by `npm run verify`, see [testing.md](testing.md)), so it should always match what the app does.

| Document | What it answers |
|---|---|
| [../dance-director-app-plan.md](../dance-director-app-plan.md) | **What are we building and why?** The product plan, MVP and open questions. |
| [architecture.md](architecture.md) | **How is the code organised, and what rules keep it that way?** |
| [features/](features/) | **What does each feature do today?** One file per folder in `src/features/`. |
| [decisions/](decisions/) | **Why did we choose X?** Short decision records (ADRs); never edited after the fact, only superseded. |
| [testing.md](testing.md) | **How do we prove a change works and didn't break anything?** |
| [../CHANGELOG.md](../CHANGELOG.md) | **What changed, and when?** |
| [../CLAUDE.md](../CLAUDE.md) | **The workflow Claude follows on every change.** |

## Where does a doc update go?

| You changed... | Update |
|---|---|
| Behaviour of a screen or feature | its file in `features/` |
| Folder structure, a layering rule, a shared building block | `architecture.md` |
| A significant technical choice (library, data shape, pattern) | a new record in `decisions/` |
| The saved data shape | `architecture.md` (data section), a new migration + fixture, and a decision record |
| A product decision or an open question got answered | the plan (`dance-director-app-plan.md`): edit the section and the Open Questions list |
| Anything user-visible or developer-visible | `CHANGELOG.md` under **Unreleased** |
| Build-order progress | the checklist in the root `README.md` |
