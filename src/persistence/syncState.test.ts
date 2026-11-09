import { describe, expect, it } from 'vitest'
import { afterDelete, afterLocalChange, afterRemote, afterSynced, NEVER_SYNCED, type SyncMeta } from './syncState'

const synced = (over: Partial<SyncMeta> = {}): SyncMeta => ({
  localRevision: 3,
  remoteRevision: 7,
  dirty: false,
  deleted: false,
  ...over,
})

describe('sync bookkeeping', () => {
  it('a never-saved project is dirty and has never synced', () => {
    expect(NEVER_SYNCED).toEqual({ localRevision: 0, remoteRevision: null, dirty: true, deleted: false })
  })

  it('a local change bumps the local revision and marks the project dirty, leaving the rest alone', () => {
    expect(afterLocalChange(synced())).toEqual({ localRevision: 4, remoteRevision: 7, dirty: true, deleted: false })
    expect(afterLocalChange(NEVER_SYNCED).localRevision).toBe(1)
  })

  describe('delete', () => {
    it('removes a project the cloud never heard of outright', () => {
      expect(afterDelete(NEVER_SYNCED)).toBe('purge')
    })

    it('keeps a tombstone (dirty, deleted) for a project the cloud knows about', () => {
      expect(afterDelete(synced())).toEqual({ localRevision: 4, remoteRevision: 7, dirty: true, deleted: true })
    })
  })

  describe('synced', () => {
    it('is clean and remembers the cloud revision when nothing changed during the upload', () => {
      const m = synced({ localRevision: 5, remoteRevision: 7, dirty: true })
      expect(afterSynced(m, { localRevision: 5, remoteRevision: 8 })).toEqual({
        localRevision: 5,
        remoteRevision: 8,
        dirty: false,
        deleted: false,
      })
    })

    it('stays dirty when the project was saved again during the upload, but still learns the cloud revision', () => {
      const m = synced({ localRevision: 6, dirty: true })
      expect(afterSynced(m, { localRevision: 5, remoteRevision: 8 })).toEqual({
        localRevision: 6,
        remoteRevision: 8,
        dirty: true,
        deleted: false,
      })
    })

    it('purges a tombstone once the cloud knows about the deletion', () => {
      const tombstone = synced({ localRevision: 4, dirty: true, deleted: true })
      expect(afterSynced(tombstone, { localRevision: 4, remoteRevision: 9 })).toBe('purge')
    })

    it('keeps a tombstone that changed again meanwhile', () => {
      const tombstone = synced({ localRevision: 5, dirty: true, deleted: true })
      const result = afterSynced(tombstone, { localRevision: 4, remoteRevision: 9 })
      expect(result).toMatchObject({ deleted: true, dirty: true, remoteRevision: 9 })
    })
  })

  it('taking the cloud version makes the copy clean, undeleted, and bumps the local revision', () => {
    const tombstone = synced({ localRevision: 4, dirty: true, deleted: true })
    expect(afterRemote(tombstone, 12)).toEqual({ localRevision: 5, remoteRevision: 12, dirty: false, deleted: false })
    expect(afterRemote(NEVER_SYNCED, 1)).toEqual({ localRevision: 1, remoteRevision: 1, dirty: false, deleted: false })
  })
})
