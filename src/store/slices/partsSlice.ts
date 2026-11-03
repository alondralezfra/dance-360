import type { StateCreator } from 'zustand'
import { newId, createEmptyProject } from '../../model/project'
import {
  DEFAULT_SECTION_LENGTH,
  MAX_PARTS,
  nextPartColor,
  nextPartName,
  normalizeSections,
} from '../../model/parts'
import type { Assignments } from '../../model/types'
import type { PartsSlice, ProjectStore } from '../storeTypes'

const empty = createEmptyProject()

export const createPartsSlice: StateCreator<ProjectStore, [], [], PartsSlice> = (set, get) => ({
  parts: empty.parts,
  sections: empty.sections,
  assignments: empty.assignments,

  addPart: () => {
    const { parts } = get()
    if (parts.length >= MAX_PARTS) return null
    const part = { id: newId(), name: nextPartName(parts), color: nextPartColor(parts) }
    set({ parts: [...parts, part] })
    return part.id
  },

  renamePart: (id, name) =>
    set((s) => ({ parts: s.parts.map((p) => (p.id === id ? { ...p, name } : p)) })),

  setPartColor: (id, color) =>
    set((s) => ({ parts: s.parts.map((p) => (p.id === id ? { ...p, color } : p)) })),

  removePart: (id) =>
    set((s) => {
      const assignments: Assignments = {}
      for (const [sectionId, byDancer] of Object.entries(s.assignments)) {
        assignments[sectionId] = Object.fromEntries(Object.entries(byDancer).filter(([, partId]) => partId !== id))
      }
      return { parts: s.parts.filter((p) => p.id !== id), assignments }
    }),

  addSection: () => {
    const s = get()
    const last = s.sections[s.sections.length - 1]
    const section = {
      id: newId(),
      name: `Section ${s.sections.length + 1}`,
      startCount: last ? last.startCount + DEFAULT_SECTION_LENGTH : 0,
    }
    set({
      sections: normalizeSections([...s.sections, section]),
      // Like new formations, a new section starts as a copy of the one before it.
      assignments: { ...s.assignments, [section.id]: { ...(last ? s.assignments[last.id] : {}) } },
    })
    return section.id
  },

  renameSection: (id, name) =>
    set((s) => ({ sections: s.sections.map((x) => (x.id === id ? { ...x, name } : x)) })),

  setSectionStart: (id, count) =>
    set((s) => {
      if (s.sections[0]?.id === id) return s // the first section is pinned to count 0
      return {
        sections: normalizeSections(
          s.sections.map((x) => (x.id === id ? { ...x, startCount: Math.max(1, count) } : x)),
        ),
      }
    }),

  removeSection: (id) =>
    set((s) => {
      if (s.sections.length <= 1) return s // there is always at least one section
      const { [id]: _removed, ...assignments } = s.assignments
      return { sections: normalizeSections(s.sections.filter((x) => x.id !== id)), assignments }
    }),

  assignDancer: (sectionId, dancerId, partId) =>
    set((s) => {
      if (partId !== null && !s.parts.some((p) => p.id === partId)) return s
      const { [dancerId]: _old, ...others } = s.assignments[sectionId] ?? {}
      return {
        assignments: {
          ...s.assignments,
          [sectionId]: partId === null ? others : { ...others, [dancerId]: partId },
        },
      }
    }),
})
