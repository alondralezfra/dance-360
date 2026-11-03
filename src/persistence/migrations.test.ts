import { describe, expect, it } from 'vitest'
import { CURRENT_VERSION, migrateProject } from './migrations'

describe('migrateProject', () => {
  const v0 = {
    name: 'Old dance',
    stage: { width: 40, depth: 24 },
    dancers: [{ id: 'd1', name: 'Maya' }],
    formations: [
      { id: 'a', name: 'A', positions: { d1: { x: 1, y: 2 } } },
      { id: 'b', name: 'B', positions: { d1: { x: 3, y: 4 } } },
    ],
  }

  it('upgrades a v0 project: spaces formations a set apart and adds a tempo map', () => {
    const p = migrateProject(0, v0)
    expect(p.tempo.bpm).toBeGreaterThan(0)
    expect(p.formations.map((f) => f.count)).toEqual([0, 8])
    expect(p.formations.every((f) => f.transitionCounts > 0)).toBe(true)
    // existing data is preserved
    expect(p.formations[1].positions.d1).toEqual({ x: 3, y: 4 })
    expect(p.dancers).toHaveLength(1)
  })

  it('leaves a current-version project unchanged', () => {
    const doc = { ...v0, tempo: { bpm: 100, startOffsetSec: 0 } }
    expect(migrateProject(CURRENT_VERSION, doc)).toEqual(doc)
  })

  it('refuses data from a newer version instead of corrupting it', () => {
    expect(() => migrateProject(CURRENT_VERSION + 1, v0)).toThrow(/newer version/)
  })
})
