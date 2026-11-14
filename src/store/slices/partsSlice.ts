import type { StateCreator } from 'zustand'
import { newId, createEmptyProject } from '../../model/project'
import {
  DEFAULT_SECTION_LENGTH,
  MAX_PARTS,
  availableParts,
  nextPartColor,
  nextPartName,
  normalizeSections,
} from '../../model/parts'
import { notesWithoutPart, notesWithoutSection } from '../../model/notes'
import { withoutPart, withoutSection } from '../../model/resources'
import type { Assignments, Part } from '../../model/types'
import type { PartsSlice, ProjectStore } from '../storeTypes'

const empty = createEmptyProject()

export const createPartsSlice: StateCreator<ProjectStore, [], [], PartsSlice> = (set, get) => ({
  parts: empty.parts,
  sections: empty.sections,
  assignments: empty.assignments,

  addPart: () => {
    const { parts } = get()
    if (parts.length >= MAX_PARTS) return null
    const part: Part = { id: newId(), name: nextPartName(parts), color: nextPartColor(parts), sectionIds: null }
    set({ parts: [...parts, part] })
    return part.id
  },

  renamePart: (id, name) =>
    set((s) => ({ parts: s.parts.map((p) => (p.id === id ? { ...p, name } : p)) })),

  setPartColor: (id, color) =>
    set((s) => ({ parts: s.parts.map((p) => (p.id === id ? { ...p, color } : p)) })),

  setPartSections: (id, sectionIds) =>
    set((s) => {
      // Keep only sections that exist, once each. Existing assignments are left
      // alone: ones for sections the part no longer covers are ignored, not lost.
      const known = new Set(s.sections.map((x) => x.id))
      const cleaned = sectionIds === null ? null : [...new Set(sectionIds)].filter((x) => known.has(x))
      return { parts: s.parts.map((p) => (p.id === id ? { ...p, sectionIds: cleaned } : p)) }
    }),

  removePart: (id) =>
    set((s) => {
      const assignments: Assignments = {}
      for (const [sectionId, byDancer] of Object.entries(s.assignments)) {
        assignments[sectionId] = Object.fromEntries(Object.entries(byDancer).filter(([, partId]) => partId !== id))
      }
      // Links and notes about this part stay, attached to no part.
      return {
        parts: s.parts.filter((p) => p.id !== id),
        assignments,
        resources: withoutPart(s.resources, id),
        notes: notesWithoutPart(s.notes, id),
      }
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
      // Like new formations, a new section starts as a copy of the one before it:
      // the same assignments, and the same parts apply (so Chorus 3 straight after
      // Chorus 2 keeps Chorus 2's parts).
      assignments: { ...s.assignments, [section.id]: { ...(last ? s.assignments[last.id] : {}) } },
      parts: last
        ? s.parts.map((p) =>
            p.sectionIds?.includes(last.id) ? { ...p, sectionIds: [...p.sectionIds, section.id] } : p,
          )
        : s.parts,
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
      return {
        sections: normalizeSections(s.sections.filter((x) => x.id !== id)),
        assignments,
        // Links and notes about this section stay, as whole-dance links and notes (a note at a count needs no change:
        // the count falls in the section that stretched over this one).
        resources: withoutSection(s.resources, id),
        notes: notesWithoutSection(s.notes, id),
        // Parts that listed this section stop listing it (one left with none applies nowhere).
        parts: s.parts.map((p) =>
          p.sectionIds?.includes(id) ? { ...p, sectionIds: p.sectionIds.filter((x) => x !== id) } : p,
        ),
      }
    }),

  assignDancer: (sectionId, dancerId, partId) =>
    set((s) => {
      // Only a part that applies in this section can be chosen there.
      if (partId !== null && !availableParts(s.parts, sectionId).some((p) => p.id === partId)) return s
      const { [dancerId]: _old, ...others } = s.assignments[sectionId] ?? {}
      return {
        assignments: {
          ...s.assignments,
          [sectionId]: partId === null ? others : { ...others, [dancerId]: partId },
        },
      }
    }),
})
