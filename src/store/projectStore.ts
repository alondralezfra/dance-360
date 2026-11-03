import { useMemo } from 'react'
import { create } from 'zustand'
import type { Formation } from '../model/types'
import { createFormationSlice } from './slices/formationSlice'
import { createProjectSlice } from './slices/projectSlice'
import { createRosterSlice } from './slices/rosterSlice'
import { createSessionSlice } from './slices/sessionSlice'
import { useUi } from './uiStore'
import type { ProjectStore } from './storeTypes'

/** The project that is currently open (the saved document plus load/save status). */
export const useProject = create<ProjectStore>()((...a) => ({
  ...createSessionSlice(...a),
  ...createProjectSlice(...a),
  ...createRosterSlice(...a),
  ...createFormationSlice(...a),
}))

/** The formation being edited (falls back to the first if the selection is stale). */
export function useCurrentFormation(): Formation {
  const formations = useProject((s) => s.formations)
  const currentId = useUi((s) => s.currentFormationId)
  return useMemo(
    () => formations.find((f) => f.id === currentId) ?? formations[0],
    [formations, currentId],
  )
}
