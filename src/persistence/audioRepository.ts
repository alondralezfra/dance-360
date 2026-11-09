import type { Peaks } from '../model/peaks'

/**
 * Where song files are kept on this device. A project's `song` records only the
 * file's name, length and hash; the bytes live here, found by that hash (decisions/0013).
 * Keyed by content, so the same file in two projects is stored once, and a project
 * opened on another device can recognise the right file when it is chosen again.
 *
 * Browser-only for now (IndexedDB); a cloud implementation can follow the same shape.
 */
export interface AudioRepository {
  /** Keeps the file under its hash. Putting the same hash again replaces it. May reject if the device is out of space. */
  put(hash: string, file: Blob): Promise<void>
  /** Resolves to null if this device doesn't have the file. */
  get(hash: string): Promise<Blob | null>
  has(hash: string): Promise<boolean>
  /** Forgets the file and its cached peaks. Unknown hashes are ignored. */
  remove(hash: string): Promise<void>
  /** The hash of every file kept. */
  list(): Promise<string[]>
  /**
   * The cached waveform peaks for a file, or null if not computed yet. Derived data:
   * it can always be recomputed from the file, so it lives here and not in the project.
   */
  getPeaks(hash: string): Promise<Peaks | null>
  putPeaks(hash: string, peaks: Peaks): Promise<void>
}
