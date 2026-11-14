import { COUNTS_PER_SET, DEFAULT_TRANSITION_COUNTS } from '../model/tempo'
import type { Project } from '../model/types'

// Saved projects are wrapped in an envelope that records which version of the
// data model wrote them. When the model changes, bump CURRENT_VERSION and add a
// migration below that upgrades the previous version. Never edit old ones.
//
//   v0  formations had no timing; no tempo map (the original prototype)
//   v1  formations have `count` + `transitionCounts`; project has `tempo`
//   v2  project has `parts`, `sections` and `assignments`
//   v3  each part has `sectionIds` (the sections it applies to; null = all)
//   v4  project has `song` (null until one is attached); `tempo` has `changes` (always empty for now)
//   v5  project has `resources` (links to videos and documents; empty until some are added)

export const CURRENT_VERSION = 5

type Doc = Record<string, unknown>

/** Each entry upgrades a document FROM that version to the next. */
const migrations: Record<number, (doc: Doc) => Doc> = {
  0: (doc) => {
    const formations = Array.isArray(doc.formations) ? doc.formations : []
    return {
      ...doc,
      tempo: { bpm: 120, startOffsetSec: 0 },
      formations: formations.map((f: Doc, i: number) => ({
        ...f,
        count: i * COUNTS_PER_SET,
        transitionCounts: DEFAULT_TRANSITION_COUNTS,
      })),
    }
  },

  // One part and one whole-dance section, with everyone already in that part, so
  // an existing project looks and behaves exactly as it did before.
  1: (doc) => {
    const dancers = Array.isArray(doc.dancers) ? (doc.dancers as Doc[]) : []
    return {
      ...doc,
      parts: [{ id: 'part-a', name: 'Part A', color: 'blue' }],
      sections: [{ id: 'section-1', name: 'Section 1', startCount: 0 }],
      assignments: { 'section-1': Object.fromEntries(dancers.map((d) => [d.id as string, 'part-a'])) },
    }
  },

  // Every existing part keeps applying everywhere, exactly as before.
  2: (doc) => {
    const parts = Array.isArray(doc.parts) ? (doc.parts as Doc[]) : []
    return { ...doc, parts: parts.map((p) => ({ ...p, sectionIds: null })) }
  },

  // No song yet; room for tempo changes (empty). Bpm and start point are kept as they were.
  3: (doc) => {
    const tempo = doc.tempo && typeof doc.tempo === 'object' ? (doc.tempo as Doc) : {}
    return {
      ...doc,
      song: null,
      tempo: { bpm: 120, startOffsetSec: 0, ...tempo, changes: [] },
    }
  },

  // No links yet; everything else is kept exactly as it was.
  4: (doc) => ({ ...doc, resources: [] }),
}

/** Upgrade a stored document to the current model. Throws if it's from the future. */
export function migrateProject(version: number, doc: Doc): Project {
  if (version > CURRENT_VERSION) {
    throw new Error(
      `This project was saved by a newer version of the app (data version ${version}).`,
    )
  }
  let current = doc
  for (let v = version; v < CURRENT_VERSION; v++) {
    current = migrations[v](current)
  }
  return current as unknown as Project
}
