import type { StateCreator } from 'zustand'
import { MAX_NOTE_LENGTH, createNote, isValidAnchor } from '../../model/notes'
import { newId } from '../../model/project'
import type { NotesSlice, ProjectStore } from '../storeTypes'

export const createNotesSlice: StateCreator<ProjectStore, [], [], NotesSlice> = (set, get) => ({
  notes: [],

  addNote: (draft) => {
    const { sections, parts } = get()
    // An anchor or part that does not exist is not guessed at: the note is not added.
    if (draft.anchor !== undefined && !isValidAnchor(draft.anchor, sections)) return null
    if (draft.partId != null && !parts.some((p) => p.id === draft.partId)) return null
    const note = createNote(newId(), draft)
    if (note === null) return null
    set({ notes: [...get().notes, note] })
    return note.id
  },

  updateNote: (id, patch) =>
    set((s) => {
      const { text, anchor, partId } = patch
      // Text may be emptied while editing (it is only required to add a note); a change that names something
      // that does not exist is ignored, and the other changes still apply.
      const changes: Partial<(typeof s.notes)[number]> = {}
      if (text !== undefined) changes.text = text.slice(0, MAX_NOTE_LENGTH)
      if (anchor !== undefined && isValidAnchor(anchor, s.sections)) changes.anchor = anchor
      if (partId !== undefined && (partId === null || s.parts.some((p) => p.id === partId))) changes.partId = partId
      return { notes: s.notes.map((n) => (n.id === id ? { ...n, ...changes } : n)) }
    }),

  removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
})
