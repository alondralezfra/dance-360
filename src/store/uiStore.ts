import { create } from 'zustand'
import type { Id } from '../model/types'

// Screen state that is NOT part of the saved project: what's selected right now.
// Ids here may go stale (e.g. after a delete), so readers fall back gracefully.

/** Who chose the current formation: the person, or the song's playhead moving past it. */
export type SelectionSource = 'user' | 'playhead'

interface UiState {
  selectedDancerId: Id | null
  currentFormationId: Id | null
  /** The stage previews a formation the person steps to; it must not do that when the playhead moved the selection. */
  selectionSource: SelectionSource
  selectDancer: (id: Id | null) => void
  selectFormation: (id: Id, source?: SelectionSource) => void
  reset: () => void
}

export const useUi = create<UiState>()((set) => ({
  selectedDancerId: null,
  currentFormationId: null,
  selectionSource: 'user',
  selectDancer: (id) => set({ selectedDancerId: id }),
  selectFormation: (id, source = 'user') => set({ currentFormationId: id, selectionSource: source }),
  reset: () => set({ selectedDancerId: null, currentFormationId: null, selectionSource: 'user' }),
}))
