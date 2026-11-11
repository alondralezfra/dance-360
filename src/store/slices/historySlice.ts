import type { StateCreator } from 'zustand'
import { emptyHistory, redo, undo } from '../../model/history'
import type { Project } from '../../model/types'
import { selectDocument, type HistorySlice, type ProjectStore } from '../storeTypes'

export const createHistorySlice: StateCreator<ProjectStore, [], [], HistorySlice> = (set, get) => ({
  history: emptyHistory<Project>(),
  undoGroup: null,
  setUndoGroup: (undoGroup) => set({ undoGroup }),

  // Putting a snapshot back replaces the document fields and the history in one
  // update; the recorder (store/history.ts) sees the history changed and does not
  // record the step again. Autosave sees the document changed and saves it.
  undo: () => {
    const s = get()
    const step = undo(s.history, selectDocument(s))
    if (step) set({ ...step.document, history: step.history })
  },

  redo: () => {
    const s = get()
    const step = redo(s.history, selectDocument(s))
    if (step) set({ ...step.document, history: step.history })
  },
})
