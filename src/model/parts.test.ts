import { describe, expect, it } from 'vitest'
import {
  MAX_PARTS,
  PART_COLOR_IDS,
  availableParts,
  effectivePartId,
  findGaps,
  isUncovered,
  nextPartColor,
  nextPartName,
  normalizeSections,
  partIdAt,
  sectionEnd,
  sectionIndexAt,
  sectionScopeLabel,
  toggleSectionInScope,
} from './parts'
import type { Dancer, Part, Section } from './types'

const part = (id: string, name: string, color: Part['color'] = 'blue', sectionIds: string[] | null = null): Part => ({
  id,
  name,
  color,
  sectionIds,
})
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

  const parts = [part('A', 'Part A'), part('B', 'Part B')] // two parts apply everywhere, so dancers must be assigned
  const assignments = { intro: { d1: 'A' }, verse: { d1: 'B' }, chorus: {} }

  it("gives a dancer's part for the section the count is in, so it changes mid-song", () => {
    expect(partIdAt(sections, parts, assignments, 'd1', 3)).toBe('A')
    expect(partIdAt(sections, parts, assignments, 'd1', 20)).toBe('B')
  })

  it('is undefined for a dancer with no assignment there', () => {
    expect(partIdAt(sections, parts, assignments, 'd1', 60)).toBeUndefined()
    expect(partIdAt(sections, parts, assignments, 'nobody', 3)).toBeUndefined()
  })

  it('is undefined when there are no sections', () => {
    expect(partIdAt([], parts, {}, 'd1', 5)).toBeUndefined()
  })

  it('is undefined for a section that has no assignment record at all', () => {
    expect(partIdAt(sections, parts, { intro: { d1: 'A' } }, 'd1', 20)).toBeUndefined()
  })

  it('puts everyone in the only part when just one applies, with no assignments at all', () => {
    expect(partIdAt(sections, [part('A', 'Part A')], {}, 'anyone', 20)).toBe('A')
  })
})

describe('which parts apply in a section', () => {
  const everywhere = part('A', 'Part A') // applies to all sections
  const floor = part('F', 'Floor', 'red', ['chorus1', 'chorus2'])
  const standing = part('S', 'Standing', 'green', ['chorus1', 'chorus2'])
  const parts = [everywhere, floor, standing]

  it('offers the all-sections parts where no part is limited to the section', () => {
    expect(availableParts(parts, 'intro')).toEqual([everywhere])
    expect(availableParts(parts, 'verse')).toEqual([everywhere])
  })

  it('lets parts limited to a section replace the all-sections parts there', () => {
    expect(availableParts(parts, 'chorus1')).toEqual([floor, standing])
    expect(availableParts(parts, 'chorus2')).toEqual([floor, standing])
  })

  it('keeps the all-sections part available in a section if no limited part covers it', () => {
    expect(availableParts([everywhere, part('F', 'Floor', 'red', ['chorus1'])], 'chorus2')).toEqual([everywhere])
  })

  it('offers nothing when no part applies', () => {
    expect(availableParts([], 'intro')).toEqual([])
    expect(availableParts([part('F', 'Floor', 'red', ['chorus1'])], 'intro')).toEqual([])
    expect(availableParts([part('N', 'Nowhere', 'red', [])], 'intro')).toEqual([])
  })

  describe('effectivePartId', () => {
    it('puts everyone in the single part that applies, without any assignment', () => {
      expect(effectivePartId(parts, {}, 'intro', 'd1')).toBe('A')
      expect(effectivePartId(parts, {}, 'verse', 'd2')).toBe('A')
    })

    it('ignores a stored choice when only one part applies', () => {
      expect(effectivePartId(parts, { intro: { d1: 'F' } }, 'intro', 'd1')).toBe('A')
    })

    it('needs a choice where several parts apply', () => {
      expect(effectivePartId(parts, {}, 'chorus1', 'd1')).toBeUndefined()
      expect(effectivePartId(parts, { chorus1: { d1: 'F' } }, 'chorus1', 'd1')).toBe('F')
    })

    it('ignores a stored choice for a part that does not apply in that section', () => {
      // d1 was put in Part A in chorus1, but Part A is replaced there by Floor/Standing
      expect(effectivePartId(parts, { chorus1: { d1: 'A' } }, 'chorus1', 'd1')).toBeUndefined()
    })

    it('brings a stored choice back when the part applies again', () => {
      const stored = { chorus1: { d1: 'F' } }
      const extra = part('X', 'Extra', 'pink', ['chorus1', 'chorus2']) // keeps two parts applying, so choices are still needed
      const narrowed = [everywhere, part('F', 'Floor', 'red', ['chorus2']), standing, extra]
      expect(effectivePartId(narrowed, stored, 'chorus1', 'd1')).toBeUndefined() // Floor no longer applies here
      expect(effectivePartId([everywhere, floor, standing, extra], stored, 'chorus1', 'd1')).toBe('F')
    })

    it('narrowing a part down to one leaves a single part there, so everyone is automatically in it', () => {
      const narrowed = [everywhere, part('F', 'Floor', 'red', ['chorus2']), standing]
      expect(effectivePartId(narrowed, { chorus1: { d1: 'F' } }, 'chorus1', 'd1')).toBe('S')
    })

    it('is undefined when no part applies', () => {
      expect(effectivePartId([], {}, 'intro', 'd1')).toBeUndefined()
    })
  })
})

describe('choosing sections for a part', () => {
  it('ticking a section while on "all sections" narrows to just that section', () => {
    expect(toggleSectionInScope(null, 'chorus1')).toEqual(['chorus1'])
  })

  it('adds more sections one by one', () => {
    expect(toggleSectionInScope(['chorus1'], 'chorus2')).toEqual(['chorus1', 'chorus2'])
  })

  it('unticks a section', () => {
    expect(toggleSectionInScope(['chorus1', 'chorus2'], 'chorus1')).toEqual(['chorus2'])
  })

  it('unticking the last section goes back to all sections', () => {
    expect(toggleSectionInScope(['chorus1'], 'chorus1')).toBeNull()
  })

  it('can add a section to a part that applies nowhere', () => {
    expect(toggleSectionInScope([], 'intro')).toEqual(['intro'])
  })

  const sections = [section('intro', 0), section('chorus1', 16), section('chorus2', 48)]

  it('labels the choice', () => {
    expect(sectionScopeLabel(null, sections)).toBe('All sections')
    expect(sectionScopeLabel([], sections)).toBe('No sections')
    expect(sectionScopeLabel(['chorus1'], sections)).toBe('chorus1')
  })

  it('lists the chosen sections in song order, whatever order they were picked in', () => {
    expect(sectionScopeLabel(['chorus2', 'intro'], sections)).toBe('intro, chorus2')
  })

  it('ignores ids of sections that no longer exist', () => {
    expect(sectionScopeLabel(['gone'], sections)).toBe('No sections')
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

  it('has no gaps when there are no parts at all: nothing to assign, everyone dances together', () => {
    expect(findGaps(dancers, sections, { s1: { d1: 'A' } }, [])).toEqual([])
  })

  it('is not a gap when only one part applies in a section: everyone is in it automatically', () => {
    expect(findGaps(dancers, sections, {}, [part('A', 'Part A')])).toEqual([])
  })

  it('flags nobody in a one-part section but still flags the multi-part section (the choruses-only case)', () => {
    const intro = section('intro', 0)
    const chorus = section('chorus', 16)
    const split = [
      part('A', 'Part A', 'blue', ['intro']),
      part('F', 'Floor', 'red', ['chorus']),
      part('S', 'Standing', 'green', ['chorus']),
    ]
    // nobody assigned anywhere: intro needs nothing; only the chorus is missing choices
    expect(findGaps(dancers, [intro, chorus], {}, split)).toEqual([
      { dancerId: 'd1', sectionId: 'chorus' },
      { dancerId: 'd2', sectionId: 'chorus' },
    ])
    expect(findGaps(dancers, [intro, chorus], { chorus: { d1: 'F', d2: 'S' } }, split)).toEqual([])
  })

  it('does not flag a section where no part applies: the dance is not split there, so everyone dances together', () => {
    const elsewhere = [part('F', 'Floor', 'red', ['s2'])]
    expect(findGaps(dancers, sections, {}, elsewhere)).toEqual([]) // s1 uncovered; s2 has just Floor (automatic)
  })

  it('the Verse 1 / Chorus case: two parts only in Verse 1 flag dancers there, and the uncovered Chorus is fine', () => {
    const verse = section('verse', 0)
    const chorus = section('chorus', 16)
    const split = [part('F', 'Floor', 'red', ['verse']), part('S', 'Standing', 'green', ['verse'])]
    expect(findGaps(dancers, [verse, chorus], {}, split)).toEqual([
      { dancerId: 'd1', sectionId: 'verse' },
      { dancerId: 'd2', sectionId: 'verse' },
    ])
    expect(findGaps(dancers, [verse, chorus], { verse: { d1: 'F', d2: 'S' } }, split)).toEqual([])
  })
})

describe('isUncovered', () => {
  it('is true when no part applies in the section', () => {
    expect(isUncovered([], 's1')).toBe(true)
    expect(isUncovered([part('F', 'Floor', 'red', ['s2'])], 's1')).toBe(true)
    expect(isUncovered([part('N', 'Nowhere', 'red', [])], 's1')).toBe(true)
  })

  it('is false when one or more parts apply', () => {
    expect(isUncovered([part('A', 'Part A')], 's1')).toBe(false) // applies everywhere
    expect(isUncovered([part('F', 'Floor', 'red', ['s1'])], 's1')).toBe(false)
  })
})
