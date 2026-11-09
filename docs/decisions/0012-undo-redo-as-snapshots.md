# 0012. Undo/redo as project snapshots, recorded by watching the store

- Status: Accepted
- Date: 2026-11-09
- Answers the "Undo/redo" half of plan §9 (version history remains open).

## Context
Plan §10 needs undo before smart assignment is safe, and every edit so far (dots, formations, roster, parts, sections, assignments) had no way back. The store already updates immutably and the saved document is eight fields, so consecutive versions share everything unchanged.

## Decision (decided with the project owner)
- **Snapshots, not operations.** History is a stack of earlier `Project` documents (`model/history.ts`, a pure generic structure: `record`, `undo`, `redo`, a 100-step cap). Chosen because editors take turns (no live co-editing), so there is one linear history per session. Operation-based undo (each action records its inverse) was the alternative if live co-editing is ever wanted; it would replace this one module, and the rest of the app doesn't know how history is stored.
- **Every project edit is undoable**, including Cast & Parts and the project name, with one shared history.
- **Session only.** History is cleared when a project is opened or closed and is never saved (not in the document, no data-version change, no migration). A reload starts clean. Saved version history is a separate, later feature.
- **Recorded by watching, not by hooking actions.** `store/history.ts` subscribes to the document fields the same way autosave does and records the previous document on every change. New actions are undoable automatically; actions never mention undo. Undo/redo update the document and `history` in one `set`; the recorder recognises that (history changed) and doesn't record it, while autosave sees the document change and saves it.
- **Typing is one step.** Edits that are only one thing's name changing, close together (under 1s apart), merge (`editGroup` decides this from the before/after documents; no per-action wiring). Dot moves already commit once on release, and numeric fields commit on blur/Enter, so they are one step each.
- **Controls:** Undo/Redo icon buttons in the project header (touch friendly, disabled when empty) and Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y. Shortcuts are ignored in text boxes so the browser's own text undo still works; they still work with a checkbox or button focused.

## Assumptions made without asking
- Selections (`uiStore`) are not part of history. After undoing, a selection that no longer exists falls back as it already does (e.g. undoing "new formation" while on it selects the first formation).
- 100 steps, 1 second typing window: easy constants in `model/history.ts`.
- Undoing does not scroll or re-select what changed.

## Consequences
- Memory is small because snapshots share unchanged parts; very large future data (e.g. audio) must stay out of the document, which is already the plan.
- Undo restores the whole document, so it is wrong for any state that must not rewind (none today). If cloud sync arrives, undo will be one more local edit to sync.
- A formation drag-reorder, a delete with its cascades, and "paste"-like bulk edits are single steps because each is a single store update.
