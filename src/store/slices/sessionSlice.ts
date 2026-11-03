import type { StateCreator } from 'zustand'
import { repository } from '../../persistence'
import type { ProjectStore, SessionSlice } from '../storeTypes'

export const createSessionSlice: StateCreator<ProjectStore, [], [], SessionSlice> = (
  set,
  get,
) => ({
  projectId: null,
  status: 'idle',
  error: null,
  saveState: 'saved',

  loadProject: async (id) => {
    set({ projectId: id, status: 'loading', error: null })
    try {
      const project = await repository.load(id)
      // Ignore the result if another project was opened while this one loaded.
      if (get().projectId !== id) return
      if (!project) {
        set({ status: 'error', error: 'That project could not be found.' })
        return
      }
      set({ ...project, status: 'ready', saveState: 'saved' })
    } catch (e) {
      if (get().projectId !== id) return
      set({
        status: 'error',
        error: e instanceof Error ? e.message : 'The project could not be opened.',
      })
    }
  },

  closeProject: () => set({ projectId: null, status: 'idle', error: null }),
})
