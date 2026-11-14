import { DEFAULT_TEMPO, DEFAULT_TRANSITION_COUNTS } from './tempo'
import type { Formation, Project } from './types'

export const newId = () => crypto.randomUUID()

export function createEmptyProject(name = 'My Dance'): Project {
  const formation: Formation = {
    id: newId(),
    name: 'Formation 1',
    count: 0,
    transitionCounts: DEFAULT_TRANSITION_COUNTS,
    positions: {},
  }
  return {
    name,
    stage: { width: 40, depth: 24 },
    tempo: { ...DEFAULT_TEMPO, changes: [] },
    song: null,
    dancers: [],
    formations: [formation],
    // One part covering every section, named so it reads as the uniform base that
    // more specific parts (Floor, Standing...) override where the dance splits.
    parts: [{ id: newId(), name: 'Everyone', color: 'blue', sectionIds: null }],
    sections: [{ id: newId(), name: 'Section 1', startCount: 0 }],
    assignments: {},
    resources: [],
    notes: [],
  }
}
