import type { History } from '../model/history'
import type { ResourceDraft } from '../model/resources'
import type {
  Assignments,
  Dancer,
  Formation,
  Id,
  PartColorId,
  Part,
  Point,
  Project,
  Resource,
  Section,
  Song,
  StageSettings,
  TempoMap,
} from '../model/types'

/** Where the open project is in its load/save lifecycle. */
type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
export type SaveState = 'saved' | 'dirty' | 'error'

export interface SessionSlice {
  projectId: Id | null
  status: LoadStatus
  error: string | null
  saveState: SaveState
  loadProject: (id: Id) => Promise<void>
  closeProject: () => void
}

export interface ProjectSlice extends Pick<Project, 'name' | 'stage' | 'tempo' | 'song'> {
  setProjectName: (name: string) => void
  setStage: (stage: StageSettings) => void
  setTempo: (tempo: TempoMap) => void
  /**
   * Attaches the song, or removes it with `null`. Pass `tempo` to set the tempo in the same
   * update, so attaching a song and the tempo estimated from it are one undo step.
   */
  setSong: (song: Song | null, tempo?: TempoMap) => void
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
  /** Moves a formation to a new place (0-based) in the running order; the landing counts stay in their slots. */
  reorderFormation: (id: Id, toIndex: number) => void
  setFormationCount: (id: Id, count: number) => void
  /**
   * Puts a formation on a count the way a tap or a dragged marker does: it keeps its place in the
   * running order (it cannot land on or before the formation before it) and later ones are pushed on just enough.
   */
  placeFormation: (id: Id, count: number) => void
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

export interface ResourcesSlice {
  resources: Resource[]
  /** Adds a link (a blank title becomes the site's name). Returns its id, or null if the address is not a usable web link. */
  addResource: (draft: ResourceDraft) => Id | null
  /**
   * Changes a link. An address that is not a usable web link, a section or a part that does not exist, leaves
   * that field as it was. `null` for the section, part or start time clears it.
   */
  updateResource: (id: Id, patch: Partial<Omit<Resource, 'id'>>) => void
  removeResource: (id: Id) => void
}

export interface HistorySlice {
  /**
   * While a take of taps is open, edits to the formations are one undo step however far apart they are.
   * Screen state: never saved. `null` when no take is open.
   */
  undoGroup: string | null
  setUndoGroup: (group: string | null) => void
  /** Undo/redo steps for the open project. Session only: never saved, cleared when a project opens or closes. */
  history: History<Project>
  /** Steps back to the project as it was before the latest edit. Does nothing if there is none. */
  undo: () => void
  /** Re-applies the edit that was just undone. Does nothing if there is none. */
  redo: () => void
}

export type ProjectStore = SessionSlice &
  ProjectSlice &
  RosterSlice &
  FormationSlice &
  PartsSlice &
  ResourcesSlice &
  HistorySlice

/** The fields that make up the saved project document. */
export const DOCUMENT_KEYS = [
  'name',
  'stage',
  'tempo',
  'song',
  'dancers',
  'formations',
  'parts',
  'sections',
  'assignments',
  'resources',
] as const

export function selectDocument(s: ProjectStore): Project {
  return {
    name: s.name,
    stage: s.stage,
    tempo: s.tempo,
    song: s.song,
    dancers: s.dancers,
    formations: s.formations,
    parts: s.parts,
    sections: s.sections,
    assignments: s.assignments,
    resources: s.resources,
  }
}
