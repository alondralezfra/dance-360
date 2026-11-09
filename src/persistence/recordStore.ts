import type { Id } from '../model/types'
import type { SyncMeta } from './syncState'

/**
 * One saved project as kept on this device: an envelope recording which version
 * of the data model wrote it, plus the sync bookkeeping. `project` is the raw
 * document, upgraded by `migrateProject` when it is loaded.
 */
export interface StoredProject {
  version: number
  /** Epoch ms of the last local change. */
  updatedAt: number
  project: Record<string, unknown>
  /** Absent in projects stored before sync existed; they read as "never synced". */
  sync?: SyncMeta
}

/**
 * Where the envelopes physically live: the one thing that differs between
 * localStorage, IndexedDB and an in-memory store for tests. All of the behaviour
 * (versions, migration, deleting, sync rules) is in `createRepository`, once.
 * Async so a database-backed store fits without changing anything above it.
 */
export interface RecordStore {
  ids(): Promise<Id[]>
  /** Resolves to null if absent; rejects if the stored value is unreadable. */
  get(id: Id): Promise<StoredProject | null>
  put(id: Id, record: StoredProject): Promise<void>
  delete(id: Id): Promise<void>
}
