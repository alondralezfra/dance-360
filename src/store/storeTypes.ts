import type { Dancer, Formation, Id, Point, Project, StageSettings, TempoMap } from '../model/types'

/** Where the open project is in its load/save lifecycle. */
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
export type SaveState = 'saved' | 'dirty' | 'error'

export interface SessionSlice {
  projectId: Id | null
  status: LoadStatus
  error: string | null
  saveState: SaveState
  loadProject: (id: Id) => Promise<void>
  closeProject: () => void
}

export interface ProjectSlice extends Pick<Project, 'name' | 'stage' | 'tempo'> {
  setProjectName: (name: string) => void
  setStage: (stage: StageSettings) => void
  setTempo: (tempo: TempoMap) => void
}

export interface RosterSlice {
  dancers: Dancer[]
  addDancer: (name: string) => void
  renameDancer: (id: Id, name: string) => void
  removeDancer: (id: Id) => void
}

export interface FormationSlice {
  formations: Formation[]
  /** Adds a formation after `afterId` (a copy of it) and returns the new id. */
  addFormation: (afterId: Id) => Id
  removeFormation: (id: Id) => void
  renameFormation: (id: Id, name: string) => void
  setFormationCount: (id: Id, count: number) => void
  setFormationTransition: (id: Id, counts: number) => void
  moveDancer: (formationId: Id, dancerId: Id, p: Point) => void
}

export type ProjectStore = SessionSlice & ProjectSlice & RosterSlice & FormationSlice

/** The fields that make up the saved project document. */
export const DOCUMENT_KEYS = ['name', 'stage', 'tempo', 'dancers', 'formations'] as const

export function selectDocument(s: ProjectStore): Project {
  return {
    name: s.name,
    stage: s.stage,
    tempo: s.tempo,
    dancers: s.dancers,
    formations: s.formations,
  }
}
