// The bookkeeping that lets a local copy of a project sync with the cloud later.
// Pure rules, no storage: the repository applies them whenever a project is saved,
// deleted, synced or replaced from the cloud. See decisions/0015.
//
// Words: "local" is this device's copy, "remote" is the cloud's. The cloud gives
// every project a revision number that goes up with each accepted save; it is the
// only clock sync trusts (device clocks can be wrong).

export interface SyncMeta {
  /** Goes up by one on every local change. Lets sync tell whether a project changed while its upload was in flight. */
  localRevision: number
  /** The cloud's revision this copy was last in step with, or null if it has never synced. */
  remoteRevision: number | null
  /** Changed on this device since it last synced (a delete counts). */
  dirty: boolean
  /** Deleted by the user. Kept as a tombstone until the cloud has been told, so the deletion isn't undone by another device. */
  deleted: boolean
}

/** What a project that has never been saved or synced looks like. Anything stored before sync existed reads as this. */
export const NEVER_SYNCED: SyncMeta = { localRevision: 0, remoteRevision: null, dirty: true, deleted: false }

/** A change made on this device (a save). */
export const afterLocalChange = (m: SyncMeta): SyncMeta => ({
  ...m,
  localRevision: m.localRevision + 1,
  dirty: true,
})

/**
 * The user deleted the project. If the cloud never heard of it, there is nothing to
 * tell it and the project can simply go ('purge'); otherwise keep a tombstone.
 */
export function afterDelete(m: SyncMeta): SyncMeta | 'purge' {
  if (m.remoteRevision === null) return 'purge'
  return { ...afterLocalChange(m), deleted: true }
}

/**
 * The cloud accepted the version with `synced.localRevision`. The project is only
 * clean if nothing was saved meanwhile; otherwise the newer save still has to go up.
 * A deletion the cloud now knows about needs no tombstone any more.
 */
export function afterSynced(
  m: SyncMeta,
  synced: { localRevision: number; remoteRevision: number },
): SyncMeta | 'purge' {
  const upToDate = m.localRevision === synced.localRevision
  if (upToDate && m.deleted) return 'purge'
  return { ...m, remoteRevision: synced.remoteRevision, dirty: !upToDate }
}

/** The cloud's version replaced this copy (it is now exactly the cloud's, and no longer deleted). */
export const afterRemote = (m: SyncMeta, remoteRevision: number): SyncMeta => ({
  localRevision: m.localRevision + 1,
  remoteRevision,
  dirty: false,
  deleted: false,
})
