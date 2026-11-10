import type { StateCreator } from 'zustand'
import { createEmptyProject } from '../../model/project'
import type { ProjectSlice, ProjectStore } from '../storeTypes'

const empty = createEmptyProject()

export const createProjectSlice: StateCreator<ProjectStore, [], [], ProjectSlice> = (
  set,
) => ({
  name: empty.name,
  stage: empty.stage,
  tempo: empty.tempo,
  song: empty.song,

  setProjectName: (name) => set({ name }),
  setStage: (stage) => set({ stage }),
  setTempo: (tempo) => set({ tempo }),
  setSong: (song, tempo) => set(tempo ? { song, tempo } : { song }),
})
