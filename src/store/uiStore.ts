import { create } from 'zustand'
import type { Id } from '../model/types'

// Screen state that is NOT part of the saved project: what's selected right now.
// Ids here may go stale (e.g. after a delete), so readers fall back gracefully.

interface UiState {
  selectedDancerId: Id | null
  currentFormationId: Id | null
  selectDancer: (id: Id | null) => void
  selectFormation: (id: Id) => void
  reset: () => void
}

export const useUi = create<UiState>()((set) => ({
  selectedDancerId: null,
  currentFormationId: null,
  selectDancer: (id) => set({ selectedDancerId: id }),
  selectFormation: (id) => set({ currentFormationId: id }),
  reset: () => set({ selectedDancerId: null, currentFormationId: null }),
}))
