import type { Id, Project } from '../model/types'

export interface ProjectSummary {
  id: Id
  name: string
  /** Epoch milliseconds of the last save. */
  updatedAt: number
}

/**
 * Where projects are stored. The UI only talks to this interface, so the
 * browser-only implementation can later be swapped for a cloud one (Supabase)
 * without touching any screens.
 */
export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>
  /** Resolves to null if there is no such project. */
  load(id: Id): Promise<Project | null>
  save(id: Id, project: Project): Promise<void>
  /** Creates a new project and returns its id. */
  create(project: Project): Promise<Id>
  remove(id: Id): Promise<void>
}
