import { COUNTS_PER_SET, DEFAULT_TEMPO, DEFAULT_TRANSITION_COUNTS } from '../model/tempo'
import type { Project } from '../model/types'

// Saved projects are wrapped in an envelope that records which version of the
// data model wrote them. When the model changes, bump CURRENT_VERSION and add a
// migration below that upgrades the previous version. Never edit old ones.
//
//   v0  formations had no timing; no tempo map (the original prototype)
//   v1  formations have `count` + `transitionCounts`; project has `tempo`

export const CURRENT_VERSION = 1

type Doc = Record<string, unknown>

/** Each entry upgrades a document FROM that version to the next. */
const migrations: Record<number, (doc: Doc) => Doc> = {
  0: (doc) => {
    const formations = Array.isArray(doc.formations) ? doc.formations : []
    return {
      ...doc,
      tempo: { ...DEFAULT_TEMPO },
      formations: formations.map((f: Doc, i: number) => ({
        ...f,
        count: i * COUNTS_PER_SET,
        transitionCounts: DEFAULT_TRANSITION_COUNTS,
      })),
    }
  },
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
