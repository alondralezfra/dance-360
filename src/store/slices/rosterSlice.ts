import type { StateCreator } from 'zustand'
import { defaultSpot } from '../../model/formations'
import { newId } from '../../model/project'
import type { Dancer } from '../../model/types'
import type { ProjectStore, RosterSlice } from '../storeTypes'

export const createRosterSlice: StateCreator<ProjectStore, [], [], RosterSlice> = (
  set,
) => ({
  dancers: [],

  addDancer: (name) =>
    set((s) => {
      const dancer: Dancer = { id: newId(), name: name.trim() || 'New dancer' }
      const spot = defaultSpot(s.dancers.length, s.stage.width, s.stage.depth)
      return {
        dancers: [...s.dancers, dancer],
        // A new dancer gets a spot in every existing formation.
        formations: s.formations.map((f) => ({
          ...f,
          positions: { ...f.positions, [dancer.id]: spot },
        })),
      }
    }),

  renameDancer: (id, name) =>
    set((s) => ({
      dancers: s.dancers.map((d) => (d.id === id ? { ...d, name } : d)),
    })),

  removeDancer: (id) =>
    set((s) => ({
      dancers: s.dancers.filter((d) => d.id !== id),
      formations: s.formations.map((f) => {
        const { [id]: _removed, ...rest } = f.positions
        return { ...f, positions: rest }
      }),
    })),
})
