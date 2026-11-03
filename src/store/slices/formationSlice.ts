import type { StateCreator } from 'zustand'
import { clampToStage, normalizeCounts } from '../../model/formations'
import { newId } from '../../model/project'
import { COUNTS_PER_SET } from '../../model/tempo'
import type { Formation } from '../../model/types'
import type { FormationSlice, ProjectStore } from '../storeTypes'

export const createFormationSlice: StateCreator<ProjectStore, [], [], FormationSlice> = (
  set,
  get,
) => ({
  formations: [],

  addFormation: (afterId) => {
    const s = get()
    // New formations start as a copy of the one before, since the next
    // formation is usually a small change from the last. It lands one set later.
    const after = s.formations.find((f) => f.id === afterId) ?? s.formations[s.formations.length - 1]
    const formation: Formation = {
      id: newId(),
      name: `Formation ${s.formations.length + 1}`,
      count: (after?.count ?? 0) + COUNTS_PER_SET,
      transitionCounts: after?.transitionCounts ?? 4,
      positions: { ...(after?.positions ?? {}) },
    }
    set({ formations: normalizeCounts([...s.formations, formation]) })
    return formation.id
  },

  removeFormation: (id) =>
    set((s) =>
      s.formations.length <= 1 // always keep at least one
        ? s
        : { formations: s.formations.filter((f) => f.id !== id) },
    ),

  renameFormation: (id, name) =>
    set((s) => ({
      formations: s.formations.map((f) => (f.id === id ? { ...f, name } : f)),
    })),

  setFormationCount: (id, count) =>
    set((s) => ({
      formations: normalizeCounts(
        s.formations.map((f) => (f.id === id ? { ...f, count } : f)),
      ),
    })),

  setFormationTransition: (id, counts) =>
    set((s) => ({
      formations: s.formations.map((f) =>
        f.id === id ? { ...f, transitionCounts: Math.max(0, Math.round(counts)) } : f,
      ),
    })),

  moveDancer: (formationId, dancerId, p) =>
    set((s) => ({
      formations: s.formations.map((f) =>
        f.id === formationId
          ? {
              ...f,
              positions: {
                ...f.positions,
                [dancerId]: clampToStage(p, s.stage.width, s.stage.depth),
              },
            }
          : f,
      ),
    })),
})
