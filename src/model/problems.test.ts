import { describe, expect, it } from 'vitest'
import { findProblems } from './problems'
import type { Formation, Part, Project } from './types'

const dancers = [
  { id: 'd1', name: 'Ana' },
  { id: 'd2', name: 'Bo' },
  { id: 'd3', name: 'Cy' },
]
const parts: Part[] = [
  { id: 'pa', name: 'Part A', color: 'blue', sectionIds: null },
  { id: 'pb', name: 'Part B', color: 'red', sectionIds: null },
]
const sections = [
  { id: 's1', name: 'Verse', startCount: 0 },
  { id: 's2', name: 'Chorus', startCount: 16 },
]
const at = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, { x: 1, y: 1 }]))
const formation = (id: string, name: string, placed: string[]): Formation => ({ id, name, count: 0, transitionCounts: 0, positions: at(placed) })

const base = (over: Partial<Project> = {}) => ({
  dancers,
  parts,
  sections,
  assignments: {
    s1: { d1: 'pa', d2: 'pb', d3: 'pa' },
    s2: { d1: 'pa', d2: 'pb', d3: 'pb' },
  },
  formations: [formation('f1', 'Formation 1', ['d1', 'd2', 'd3'])],
  ...over,
})

describe('findProblems', () => {
  it('finds nothing in a complete project, and in an empty one', () => {
    expect(findProblems(base())).toEqual([])
    expect(findProblems({ dancers: [], parts: [], sections: [sections[0]], assignments: {}, formations: [] })).toEqual([])
  })

  it('reports dancers with no part in a section, naming them', () => {
    const problems = findProblems(base({ assignments: { s1: { d1: 'pa' }, s2: { d1: 'pa', d2: 'pb', d3: 'pb' } } }))
    expect(problems).toEqual([
      { kind: 'no-part', sectionId: 's1', message: '2 dancers have no part in Verse', detail: 'Bo, Cy' },
    ])
  })

  it('uses singular wording for one dancer', () => {
    const [p] = findProblems(base({ assignments: { s1: { d1: 'pa', d2: 'pb' }, s2: { d1: 'pa', d2: 'pb', d3: 'pb' } } }))
    expect(p.message).toBe('1 dancer has no part in Verse')
  })

  it('does not count a choice for a part that no longer applies in the section', () => {
    const limited: Part[] = [
      { id: 'pa', name: 'Part A', color: 'blue', sectionIds: null },
      { id: 'pf', name: 'Floor', color: 'green', sectionIds: ['s2'] },
      { id: 'ps', name: 'Standing', color: 'pink', sectionIds: ['s2'] },
    ]
    // In s1 only Part A applies, so everyone is in it automatically; in s2 Floor/Standing replace it.
    const problems = findProblems(base({ parts: limited, assignments: { s2: { d1: 'pf', d2: 'pa' } } }))
    expect(problems.map((p) => p.message)).toEqual(['2 dancers have no part in Chorus'])
  })

  it('stays quiet about parts when none apply in a section (parts not set up yet)', () => {
    expect(findProblems(base({ parts: [], assignments: {} }))).toEqual([])
    const none: Part[] = [{ id: 'pa', name: 'Part A', color: 'blue', sectionIds: [] }]
    expect(findProblems(base({ parts: none, assignments: {} }))).toEqual([])
  })

  it('reports a formation that does not place every dancer', () => {
    const problems = findProblems(base({ formations: [formation('f1', 'Formation 1', ['d1', 'd2', 'd3']), formation('f2', 'Formation 7', ['d1'])] }))
    expect(problems).toEqual([
      { kind: 'not-placed', formationId: 'f2', message: 'Formation 7 has 1 of 3 dancers placed', detail: 'Not placed: Bo, Cy' },
    ])
  })

  it('ignores positions of dancers who are no longer in the cast', () => {
    const f = formation('f1', 'Formation 1', ['d1', 'd2', 'd3', 'gone'])
    expect(findProblems(base({ formations: [f] }))).toEqual([])
  })

  it('lists section problems first, then formations, and shortens a long list of names', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `x${i}`, name: i === 8 ? '  ' : `D${i}` }))
    const problems = findProblems({
      dancers: many,
      parts,
      sections: [sections[0]],
      assignments: {},
      formations: [formation('f1', 'Formation 1', [])],
    })
    expect(problems.map((p) => p.kind)).toEqual(['no-part', 'not-placed'])
    expect(problems[0].detail).toBe('D0, D1, D2, D3, D4, D5 and 3 more')
    expect(problems[1].message).toBe('Formation 1 has 0 of 9 dancers placed')
  })

  it('shows a blank name as Unnamed', () => {
    const [p] = findProblems(base({ dancers: [{ id: 'd1', name: ' ' }], assignments: {}, formations: [] }))
    expect(p.detail).toBe('Unnamed')
  })
})
