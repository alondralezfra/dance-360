import { describe, expect, it } from 'vitest'
import {
  MAX_PARTS,
  PART_COLOR_IDS,
  findGaps,
  nextPartColor,
  nextPartName,
  normalizeSections,
  partIdAt,
  sectionEnd,
  sectionIndexAt,
} from './parts'
import type { Dancer, Part, Section } from './types'

const part = (id: string, name: string, color: Part['color'] = 'blue'): Part => ({ id, name, color })
const section = (id: string, startCount: number): Section => ({ id, name: id, startCount })
const dancer = (id: string): Dancer => ({ id, name: id })

describe('part naming and colours', () => {
  it('names parts A, B, C in order', () => {
    expect(nextPartName([])).toBe('Part A')
    expect(nextPartName([part('1', 'Part A')])).toBe('Part B')
  })

  it('reuses a letter freed by a removed or renamed part', () => {
    expect(nextPartName([part('1', 'Part B'), part('2', 'Part C')])).toBe('Part A')
    expect(nextPartName([part('1', 'Lead'), part('2', 'Part A')])).toBe('Part B')
  })

  it('falls back to a number once the alphabet is used up', () => {
    const all = Array.from({ length: 26 }, (_, i) => part(String(i), `Part ${String.fromCharCode(65 + i)}`))
    expect(nextPartName(all)).toBe('Part 27')
  })

  it('picks the first palette colour not in use', () => {
    expect(nextPartColor([])).toBe(PART_COLOR_IDS[0])
    expect(nextPartColor([part('1', 'A', 'blue'), part('2', 'B', 'red')])).toBe('green')
    expect(nextPartColor([part('1', 'A', 'red')])).toBe('blue')
  })

  it('cycles when every colour is taken', () => {
    const all = PART_COLOR_IDS.map((c, i) => part(String(i), `P${i}`, c))
    expect(PART_COLOR_IDS).toContain(nextPartColor(all))
    expect(all).toHaveLength(MAX_PARTS)
  })

  it('has a distinct palette colour for every possible part', () => {
    expect(new Set(PART_COLOR_IDS).size).toBe(MAX_PARTS)
  })
})

describe('normalizeSections', () => {
  it('sorts by start count', () => {
    expect(normalizeSections([section('b', 16), section('a', 0)]).map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('forces the first section to start at 0', () => {
    expect(normalizeSections([section('a', 12), section('b', 40)]).map((s) => s.startCount)).toEqual([0, 40])
  })

  it('pushes collisions later by the minimum needed', () => {
    expect(normalizeSections([section('a', 0), section('b', 8), section('c', 8), section('d', 9)]).map((s) => s.startCount)).toEqual([
      0, 8, 9, 10,
    ])
  })

  it('rounds fractions and never goes below zero', () => {
    expect(normalizeSections([section('a', -5), section('b', 7.6)]).map((s) => s.startCount)).toEqual([0, 8])
  })

  it('keeps ties in their existing order', () => {
    expect(normalizeSections([section('x', 8), section('y', 8)]).map((s) => s.id)).toEqual(['x', 'y'])
  })

  it('does not copy sections that are already valid', () => {
    const a = section('a', 0)
    expect(normalizeSections([a])[0]).toBe(a)
  })

  it('handles an empty list', () => {
    expect(normalizeSections([])).toEqual([])
  })
})

describe('finding the section and part at a count', () => {
  const sections = [section('intro', 0), section('verse', 16), section('chorus', 48)]

  it('finds the section a count falls in', () => {
    expect(sectionIndexAt(sections, 0)).toBe(0)
    expect(sectionIndexAt(sections, 15)).toBe(0)
    expect(sectionIndexAt(sections, 16)).toBe(1)
    expect(sectionIndexAt(sections, 47.9)).toBe(1)
    expect(sectionIndexAt(sections, 48)).toBe(2)
    expect(sectionIndexAt(sections, 9999)).toBe(2)
  })

  it('puts counts before the first section in the first section', () => {
    expect(sectionIndexAt(sections, -4)).toBe(0)
  })

  it('reports where each section ends', () => {
    expect(sectionEnd(sections, 0)).toBe(16)
    expect(sectionEnd(sections, 1)).toBe(48)
    expect(sectionEnd(sections, 2)).toBeNull()
  })

  const assignments = { intro: { d1: 'A' }, verse: { d1: 'B' }, chorus: {} }

  it("gives a dancer's part for the section the count is in, so it changes mid-song", () => {
    expect(partIdAt(sections, assignments, 'd1', 3)).toBe('A')
    expect(partIdAt(sections, assignments, 'd1', 20)).toBe('B')
  })

  it('is undefined for a dancer with no assignment there', () => {
    expect(partIdAt(sections, assignments, 'd1', 60)).toBeUndefined()
    expect(partIdAt(sections, assignments, 'nobody', 3)).toBeUndefined()
  })

  it('is undefined when there are no sections', () => {
    expect(partIdAt([], {}, 'd1', 5)).toBeUndefined()
  })

  it('is undefined for a section that has no assignment record at all', () => {
    expect(partIdAt(sections, { intro: { d1: 'A' } }, 'd1', 20)).toBeUndefined()
  })
})

describe('findGaps', () => {
  const dancers = [dancer('d1'), dancer('d2')]
  const sections = [section('s1', 0), section('s2', 16)]
  const parts = [part('A', 'Part A'), part('B', 'Part B')]

  it('finds no gaps when everyone has a part everywhere', () => {
    const full = { s1: { d1: 'A', d2: 'B' }, s2: { d1: 'B', d2: 'B' } }
    expect(findGaps(dancers, sections, full, parts)).toEqual([])
  })

  it('reports each missing dancer/section pair', () => {
    const partial = { s1: { d1: 'A' }, s2: { d1: 'B', d2: 'A' } }
    expect(findGaps(dancers, sections, partial, parts)).toEqual([{ dancerId: 'd2', sectionId: 's1' }])
  })

  it('treats a section with no record as entirely unassigned', () => {
    expect(findGaps(dancers, sections, { s1: { d1: 'A', d2: 'A' } }, parts)).toHaveLength(2)
  })

  it('treats an assignment to a part that no longer exists as a gap', () => {
    const dangling = { s1: { d1: 'GONE', d2: 'A' }, s2: { d1: 'A', d2: 'A' } }
    expect(findGaps(dancers, sections, dangling, parts)).toEqual([{ dancerId: 'd1', sectionId: 's1' }])
  })

  it('has no gaps when there are no dancers', () => {
    expect(findGaps([], sections, {}, parts)).toEqual([])
  })

  it('flags everyone when there are no parts', () => {
    expect(findGaps(dancers, sections, { s1: { d1: 'A' } }, [])).toHaveLength(4)
  })
})
