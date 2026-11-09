import type { Peaks } from '../model/peaks'
import type { AudioRepository } from './audioRepository'

const FILES = 'files'
const PEAKS = 'peaks'

/** Waits for one IndexedDB request. */
const done = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

/** Waits for a transaction to be saved (or fail, e.g. when the device is out of space). */
const committed = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new DOMException('The save was cancelled.', 'AbortError'))
  })

/**
 * Song files in the browser's IndexedDB: one store for the files, one for their
 * cached peaks, both keyed by the file's hash. `factory` and `name` are
 * injectable so tests can use a fake database; by default the browser's own is
 * looked up only when first needed, so merely importing this is safe anywhere.
 */
export function createIndexedDbAudioRepository(factory?: IDBFactory, name = 'dance360-audio'): AudioRepository {
  let opened: Promise<IDBDatabase> | null = null
  let askedToPersist = false

  const open = () =>
    (opened ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = (factory ?? indexedDB).open(name, 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore(FILES)
        request.result.createObjectStore(PEAKS)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        opened = null // let a later call try again
        reject(request.error)
      }
    }))

  /** Ask the browser not to evict the songs when it is short of space. Best effort, once. */
  const requestPersistence = () => {
    if (askedToPersist) return
    askedToPersist = true
    void navigator.storage?.persist?.().catch(() => {})
  }

  return {
    async put(hash, file) {
      requestPersistence()
      const tx = (await open()).transaction(FILES, 'readwrite')
      tx.objectStore(FILES).put(file, hash)
      await committed(tx)
    },

    async get(hash) {
      const found = await done((await open()).transaction(FILES).objectStore(FILES).get(hash))
      return (found as Blob | undefined) ?? null
    },

    async has(hash) {
      return (await done((await open()).transaction(FILES).objectStore(FILES).count(hash))) > 0
    },

    async remove(hash) {
      const tx = (await open()).transaction([FILES, PEAKS], 'readwrite')
      tx.objectStore(FILES).delete(hash)
      tx.objectStore(PEAKS).delete(hash)
      await committed(tx)
    },

    async list() {
      const keys = await done((await open()).transaction(FILES).objectStore(FILES).getAllKeys())
      return keys.map(String)
    },

    async getPeaks(hash) {
      const found = await done((await open()).transaction(PEAKS).objectStore(PEAKS).get(hash))
      return (found as Peaks | undefined) ?? null
    },

    async putPeaks(hash, peaks) {
      const tx = (await open()).transaction(PEAKS, 'readwrite')
      tx.objectStore(PEAKS).put({ perSecond: peaks.perSecond, data: peaks.data }, hash)
      await committed(tx)
    },
  }
}
