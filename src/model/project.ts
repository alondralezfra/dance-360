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
    tempo: { ...DEFAULT_TEMPO },
    dancers: [],
    formations: [formation],
    // One part and one section to start, so the assignment grid is usable immediately.
    parts: [{ id: newId(), name: 'Part A', color: 'blue' }],
    sections: [{ id: newId(), name: 'Section 1', startCount: 0 }],
    assignments: {},
  }
}
