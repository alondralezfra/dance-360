import type { RecordStore, StoredProject } from './recordStore'

const PREFIX = 'dance360:project:'

/** Keeps each project under its own `localStorage` key, as a JSON envelope. */
export const localStorageRecordStore: RecordStore = {
  async ids() {
    const ids: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(PREFIX)) ids.push(key.slice(PREFIX.length))
    }
    return ids
  },

  async get(id) {
    const raw = localStorage.getItem(PREFIX + id)
    return raw ? (JSON.parse(raw) as StoredProject) : null
  },

  async put(id, record) {
    localStorage.setItem(PREFIX + id, JSON.stringify(record))
  },

  async delete(id) {
    localStorage.removeItem(PREFIX + id)
  },
}
