import type { StateCreator } from 'zustand'
import { newId } from '../../model/project'
import { createResource, normalizeUrl } from '../../model/resources'
import type { ProjectStore, ResourcesSlice } from '../storeTypes'

export const createResourcesSlice: StateCreator<ProjectStore, [], [], ResourcesSlice> = (set, get) => ({
  resources: [],

  addResource: (draft) => {
    const resource = createResource(newId(), draft)
    if (resource === null) return null
    set({ resources: [...get().resources, resource] })
    return resource.id
  },

  updateResource: (id, patch) =>
    set((s) => {
      // The address is only ever stored in its standard form; one that is not usable leaves the link as it was.
      const url = patch.url === undefined ? undefined : normalizeUrl(patch.url)
      if (url === null) return s
      // A section or part that does not exist is ignored, like the parts slice ignores unknown sections.
      const sectionOk = patch.sectionId == null || s.sections.some((x) => x.id === patch.sectionId)
      const partOk = patch.partId == null || s.parts.some((x) => x.id === patch.partId)
      const { url: _typed, ...rest } = patch
      const safe = { ...rest, ...(url === undefined ? {} : { url }) }
      if (!sectionOk) delete safe.sectionId
      if (!partOk) delete safe.partId
      return { resources: s.resources.map((r) => (r.id === id ? { ...r, ...safe, id } : r)) }
    }),

  removeResource: (id) => set((s) => ({ resources: s.resources.filter((r) => r.id !== id) })),
})
