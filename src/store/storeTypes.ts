import type {
  Assignments,
  Dancer,
  Formation,
  Id,
  PartColorId,
  Part,
  Point,
  Project,
  Section,
  StageSettings,
  TempoMap,
} from '../model/types'

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

export interface PartsSlice {
  parts: Part[]
  sections: Section[]
  assignments: Assignments
  /** Adds the next part (next free letter and colour). Returns its id, or null at the 8-part limit. */
  addPart: () => Id | null
  renamePart: (id: Id, name: string) => void
  setPartColor: (id: Id, color: PartColorId) => void
  /** Limits a part to specific sections, or `null` for all sections. */
  setPartSections: (id: Id, sectionIds: Id[] | null) => void
  /** Removes a part; dancers who were in it become unassigned. */
  removePart: (id: Id) => void
  /** Adds a section after the last one, copying the last section's assignments. Returns its id. */
  addSection: () => Id
  renameSection: (id: Id, name: string) => void
  /** Moves a section's start. The first section always starts at 0 and can't be moved. */
  setSectionStart: (id: Id, count: number) => void
  /** Removes a section (never the last one); a following section stretches back over it. */
  removeSection: (id: Id) => void
  /** Puts a dancer in a part for a section; `null` clears it. */
  assignDancer: (sectionId: Id, dancerId: Id, partId: Id | null) => void
}

export type ProjectStore = SessionSlice & ProjectSlice & RosterSlice & FormationSlice & PartsSlice

/** The fields that make up the saved project document. */
export const DOCUMENT_KEYS = [
  'name',
  'stage',
  'tempo',
  'dancers',
  'formations',
  'parts',
  'sections',
  'assignments',
] as const

export function selectDocument(s: ProjectStore): Project {
  return {
    name: s.name,
    stage: s.stage,
    tempo: s.tempo,
    dancers: s.dancers,
    formations: s.formations,
    parts: s.parts,
    sections: s.sections,
    assignments: s.assignments,
  }
}
