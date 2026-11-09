import type { Peaks } from '../model/peaks'
import type { AudioRepository } from './audioRepository'

/** Song storage in memory only, for tests. */
export function createMemoryAudioRepository(): AudioRepository {
  const files = new Map<string, Blob>()
  const peaks = new Map<string, Peaks>()
  return {
    async put(hash, file) {
      files.set(hash, file)
    },
    async get(hash) {
      return files.get(hash) ?? null
    },
    async has(hash) {
      return files.has(hash)
    },
    async remove(hash) {
      files.delete(hash)
      peaks.delete(hash)
    },
    async list() {
      return [...files.keys()]
    },
    async getPeaks(hash) {
      const found = peaks.get(hash)
      return found ? { perSecond: found.perSecond, data: found.data.slice() } : null
    },
    async putPeaks(hash, value) {
      peaks.set(hash, { perSecond: value.perSecond, data: value.data.slice() })
    },
  }
}
