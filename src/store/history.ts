import { editGroup, emptyHistory, record } from '../model/history'
import type { Project } from '../model/types'
import { useProject } from './projectStore'
import { DOCUMENT_KEYS, selectDocument } from './storeTypes'

/**
 * Remembers every edit to the open project so it can be undone. Like autosave it
 * watches the document fields rather than hooking each action, so every current
 * and future edit is covered without the actions knowing about undo. Call once at startup.
 *
 * - Opening or closing a project starts with a clean history.
 * - Undo/redo change `history` as well as the document in one update; that is how
 *   this recognises them and avoids recording the step it just made.
 */
export function startHistory() {
  return useProject.subscribe((state, prev) => {
    if (state.projectId !== prev.projectId || state.status !== prev.status) {
      const h = state.history
      if (h.past.length > 0 || h.future.length > 0 || h.lastGroup) {
        useProject.setState({ history: emptyHistory<Project>() })
      }
      return
    }
    if (state.status !== 'ready') return
    if (state.history !== prev.history) return // an undo/redo, or this recorder's own update
    if (DOCUMENT_KEYS.every((k) => state[k] === prev[k])) return

    const before = selectDocument(prev)
    const after = selectDocument(state)
    useProject.setState({
      history: record(state.history, before, editGroup(before, after), Date.now()),
    })
  })
}
