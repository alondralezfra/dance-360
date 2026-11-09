import { newId } from '../model/project'
import type { Id, Project } from '../model/types'
import { CURRENT_VERSION, migrateProject } from './migrations'
import type { RecordStore, StoredProject } from './recordStore'
import type { ProjectRepository, ProjectSummary, SyncRecord, SyncSource } from './repository'
import {
  afterDelete,
  afterLocalChange,
  afterRemote,
  afterSynced,
  NEVER_SYNCED,
  type SyncMeta,
} from './syncState'

const metaOf = (record: StoredProject | null | undefined): SyncMeta => record?.sync ?? NEVER_SYNCED

/**
 * The repository, written once over any `RecordStore`: versioned envelopes,
 * migration on load, deleting, and the sync bookkeeping. localStorage, in-memory
 * (tests) and later IndexedDB differ only in the store they pass in.
 *
 * `now` is the clock for `updatedAt` (injectable for tests).
 */
export function createRepository(
  store: RecordStore,
  now: () => number = () => Date.now(),
): ProjectRepository & SyncSource {
  /** The stored record, or null if it is missing or unreadable (a bad one must not stop a save). */
  const read = (id: Id) => store.get(id).catch(() => null)

  const write = (id: Id, project: Project | Record<string, unknown>, sync: SyncMeta) =>
    store.put(id, {
      version: CURRENT_VERSION,
      updatedAt: now(),
      project: project as Record<string, unknown>,
      sync,
    })

  /** Applies a result from `syncState`: store the new bookkeeping, or drop the project. */
  async function settle(id: Id, record: StoredProject, next: SyncMeta | 'purge') {
    if (next === 'purge') await store.delete(id)
    else await store.put(id, { ...record, sync: next })
  }

  return {
    async list() {
      const summaries: ProjectSummary[] = []
      for (const id of await store.ids()) {
        try {
          const record = await store.get(id)
          if (!record || metaOf(record).deleted) continue
          summaries.push({
            id,
            name: String(record.project.name ?? 'Untitled'),
            updatedAt: record.updatedAt,
          })
        } catch {
          // Skip unreadable entries rather than hiding every project.
        }
      }
      return summaries.sort((a, b) => b.updatedAt - a.updatedAt)
    },

    async load(id) {
      const record = await store.get(id)
      if (!record || metaOf(record).deleted) return null
      return migrateProject(record.version, record.project)
    },

    async save(id, project) {
      const previous = await read(id)
      if (metaOf(previous).deleted) throw new Error('This project was deleted, so it cannot be saved.')
      await write(id, project, afterLocalChange(metaOf(previous)))
    },

    async create(project) {
      const id = newId()
      await write(id, project, afterLocalChange(NEVER_SYNCED))
      return id
    },

    async remove(id) {
      const record = await read(id)
      if (!record) return
      const next = afterDelete(metaOf(record))
      if (next === 'purge') await store.delete(id)
      else await store.put(id, { ...record, updatedAt: now(), sync: next })
    },

    async songHashes() {
      const hashes = new Set<string>()
      for (const id of await store.ids()) {
        const hash = (await read(id))?.project.song
        const value = hash && typeof hash === 'object' ? (hash as { hash?: unknown }).hash : undefined
        if (typeof value === 'string') hashes.add(value)
      }
      return hashes
    },

    async listSyncRecords() {
      const records: SyncRecord[] = []
      for (const id of await store.ids()) {
        try {
          const record = await store.get(id)
          if (!record) continue
          const meta = metaOf(record)
          records.push({
            id,
            project: migrateProject(record.version, record.project),
            localRevision: meta.localRevision,
            remoteRevision: meta.remoteRevision,
            dirty: meta.dirty,
            deleted: meta.deleted,
          })
        } catch {
          // An unreadable or too-new project can't be synced; leave it alone.
        }
      }
      return records
    },

    async markSynced(id, synced) {
      const record = await read(id)
      if (!record) return
      await settle(id, record, afterSynced(metaOf(record), synced))
    },

    async applyRemote(id, project, remoteRevision) {
      const previous = await read(id)
      await write(id, project, afterRemote(metaOf(previous), remoteRevision))
    },

    async purge(id) {
      await store.delete(id)
    },
  }
}
