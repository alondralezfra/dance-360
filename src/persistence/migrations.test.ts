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

  it('copes with a v0 document that has no formations at all', () => {
    const p = migrateProject(0, { name: 'Empty', stage: { width: 40, depth: 24 }, dancers: [] })
    expect(p.formations).toEqual([])
    expect(p.tempo.bpm).toBeGreaterThan(0)
  })

  it('v2 -> v3: every part keeps applying to all sections, and nothing else changes', () => {
    const v2 = {
      ...v0,
      tempo: { bpm: 120, startOffsetSec: 0 },
      parts: [
        { id: 'a', name: 'Part A', color: 'blue' },
        { id: 'b', name: 'Part B', color: 'red' },
      ],
      sections: [{ id: 's1', name: 'Intro', startCount: 0 }],
      assignments: { s1: { d1: 'a' } },
    }
    const p = migrateProject(2, structuredClone(v2))
    expect(p.parts).toEqual([
      { id: 'a', name: 'Part A', color: 'blue', sectionIds: null },
      { id: 'b', name: 'Part B', color: 'red', sectionIds: null },
    ])
    expect(p.sections).toEqual(v2.sections)
    expect(p.assignments).toEqual(v2.assignments)
  })

  it('v2 -> v3: copes with a missing parts list', () => {
    expect(migrateProject(2, { name: 'x' }).parts).toEqual([])
  })

  it('v1 -> v2: adds one part and one section with every dancer already in that part', () => {
    const v1 = {
      ...v0,
      tempo: { bpm: 120, startOffsetSec: 0 },
      dancers: [
        { id: 'd1', name: 'Maya' },
        { id: 'd2', name: 'Jordan' },
      ],
    }
    const p = migrateProject(1, v1)
    // (v1 is migrated all the way to the current version, so the part also gets v3's `sectionIds`)
    expect(p.parts).toEqual([{ id: 'part-a', name: 'Part A', color: 'blue', sectionIds: null }])
    expect(p.sections).toEqual([{ id: 'section-1', name: 'Section 1', startCount: 0 }])
    expect(p.assignments).toEqual({ 'section-1': { d1: 'part-a', d2: 'part-a' } })
  })

  it('v1 -> v2: a project with no dancers gets an empty assignment set', () => {
    const p = migrateProject(1, { ...v0, tempo: { bpm: 120, startOffsetSec: 0 }, dancers: [] })
    expect(p.assignments).toEqual({ 'section-1': {} })
  })

  it('v1 -> v2: copes with a missing dancers list', () => {
    const p = migrateProject(1, { name: 'x' })
    expect(p.assignments).toEqual({ 'section-1': {} })
  })

  it('v0 projects are carried all the way to the current version', () => {
    const p = migrateProject(0, v0)
    expect(p.parts).toHaveLength(1)
    expect(p.sections).toHaveLength(1)
    expect(p.assignments['section-1']).toEqual({ d1: 'part-a' })
  })

  it('leaves a current-version project unchanged', () => {
    const doc = { ...v0, tempo: { bpm: 100, startOffsetSec: 0 } }
    expect(migrateProject(CURRENT_VERSION, doc)).toEqual(doc)
  })

  it('refuses data from a newer version instead of corrupting it', () => {
    expect(() => migrateProject(CURRENT_VERSION + 1, v0)).toThrow(/newer version/)
  })
})
