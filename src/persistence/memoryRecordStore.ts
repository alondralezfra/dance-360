import type { RecordStore, StoredProject } from './recordStore'

/** A store that lives in memory only. For tests (and a stand-in "cloud" in sync tests). Stores copies, like real storage does. */
export function createMemoryRecordStore(): RecordStore {
  const records = new Map<string, StoredProject>()
  return {
    async ids() {
      return [...records.keys()]
    },
    async get(id) {
      const record = records.get(id)
      return record ? structuredClone(record) : null
    },
    async put(id, record) {
      records.set(id, structuredClone(record))
    },
    async delete(id) {
      records.delete(id)
    },
  }
}
