import type { Id, Project } from '../model/types'

export interface ProjectSummary {
  id: Id
  name: string
  /** Epoch milliseconds of the last save. */
  updatedAt: number
}

/**
 * Where projects are stored on this device. The UI only talks to this interface,
 * so the storage underneath (localStorage today, IndexedDB later) can change
 * without touching any screens. Cloud sync is built *on top of* this (see
 * `SyncSource`), not instead of it: the app always works from the local copy.
 */
export interface ProjectRepository {
  /** Projects that have not been deleted, most recently saved first. */
  list(): Promise<ProjectSummary[]>
  /** Resolves to null if there is no such project (or it was deleted). */
  load(id: Id): Promise<Project | null>
  /** Throws if the project was deleted: a late save must not bring it back. */
  save(id: Id, project: Project): Promise<void>
  /** Creates a new project and returns its id. */
  create(project: Project): Promise<Id>
  /** Deletes a project. It disappears from the app immediately. */
  remove(id: Id): Promise<void>
  /**
   * The hash of every song any stored project uses, including deleted projects still
   * awaiting sync (they could come back). Song files whose hash is not in here are
   * unused and can be cleared from the device.
   */
  songHashes(): Promise<Set<string>>
}

/** A project as the sync engine sees it: the document plus how it relates to the cloud. */
export interface SyncRecord {
  id: Id
  project: Project
  /** Goes up on every local change; passed back to `markSynced` so a save made during an upload isn't marked as synced. */
  localRevision: number
  /** The cloud's revision this copy was last in step with, or null if never synced. */
  remoteRevision: number | null
  /** Changed on this device since it last synced (including being deleted). */
  dirty: boolean
  /** Deleted by the user; kept until the cloud has been told. */
  deleted: boolean
}

/**
 * What a sync engine needs from the local store. Deliberately separate from
 * `ProjectRepository` so screens can't reach it. See decisions/0015.
 */
export interface SyncSource {
  /** Every project including deleted ones awaiting sync (tombstones). */
  listSyncRecords(): Promise<SyncRecord[]>
  /**
   * The cloud accepted the upload of `localRevision` and now has `remoteRevision`.
   * The project stays dirty if it was saved again since. A deletion the cloud now
   * knows about is removed for good. Unknown ids are ignored.
   */
  markSynced(id: Id, synced: { localRevision: number; remoteRevision: number }): Promise<void>
  /** Replace (or create) the local copy with the cloud's version: the "use theirs" path and first download. Discards local changes. */
  applyRemote(id: Id, project: Project, remoteRevision: number): Promise<void>
  /** Remove a project completely, tombstone included. Unknown ids are ignored. */
  purge(id: Id): Promise<void>
}
