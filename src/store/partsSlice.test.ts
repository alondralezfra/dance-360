import { beforeEach, describe, expect, it } from 'vitest'
import { findGaps, MAX_PARTS } from '../model/parts'
import { createEmptyProject } from '../model/project'
import { useProject } from './projectStore'

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
})

const s = () => useProject.getState()
const partA = () => s().parts[0].id
const firstSection = () => s().sections[0].id

describe('a new project', () => {
  it('starts with one part and one section starting at count 0', () => {
    expect(s().parts.map((p) => p.name)).toEqual(['Part A'])
    expect(s().sections.map((x) => x.startCount)).toEqual([0])
    expect(s().assignments).toEqual({})
  })
})

describe('parts', () => {
  it('adds parts with the next letter and a distinct colour', () => {
    const id = s().addPart()
    expect(s().parts.map((p) => p.name)).toEqual(['Part A', 'Part B'])
    expect(s().parts.find((p) => p.id === id)!.color).not.toBe(s().parts[0].color)
  })

  it('stops at the palette size', () => {
    for (let i = 0; i < 20; i++) s().addPart()
    expect(s().parts).toHaveLength(MAX_PARTS)
    expect(s().addPart()).toBeNull()
    expect(new Set(s().parts.map((p) => p.color)).size).toBe(MAX_PARTS)
  })

  it('renames and recolours a part', () => {
    s().renamePart(partA(), 'Floor work')
    s().setPartColor(partA(), 'green')
    expect(s().parts[0]).toMatchObject({ name: 'Floor work', color: 'green' })
  })

  it('removing a part clears it from every assignment and leaves other parts alone', () => {
    s().addDancer('Maya')
    s().addDancer('Jordan')
    const [maya, jordan] = s().dancers
    const b = s().addPart()!
    const second = s().addSection()
    s().assignDancer(firstSection(), maya.id, partA())
    s().assignDancer(firstSection(), jordan.id, b)
    s().assignDancer(second, maya.id, partA())

    s().removePart(partA())

    expect(s().parts.map((p) => p.id)).toEqual([b])
    expect(s().assignments[firstSection()]).toEqual({ [jordan.id]: b })
    expect(s().assignments[second]).toEqual({})
    // Maya's part was removed in both sections, so she is now a gap in both.
    const gaps = findGaps(s().dancers, s().sections, s().assignments, s().parts)
    expect(gaps.filter((g) => g.dancerId === maya.id).map((g) => g.sectionId)).toEqual([firstSection(), second])
    // Jordan keeps Part B in the first section (the second was created before anyone was assigned).
    expect(gaps.some((g) => g.dancerId === jordan.id && g.sectionId === firstSection())).toBe(false)
  })

  it('can remove every part', () => {
    s().removePart(partA())
    expect(s().parts).toEqual([])
  })
})

describe('sections', () => {
  it('adds a section two sets after the last, named in order', () => {
    s().addSection()
    s().addSection()
    expect(s().sections.map((x) => [x.name, x.startCount])).toEqual([
      ['Section 1', 0],
      ['Section 2', 16],
      ['Section 3', 32],
    ])
  })

  it('a new section copies the previous section’s assignments', () => {
    s().addDancer('Maya')
    s().addDancer('Jordan')
    const [maya] = s().dancers
    s().assignDancer(firstSection(), maya.id, partA())
    const id = s().addSection()
    expect(s().assignments[id]).toEqual({ [maya.id]: partA() })
  })

  it('the copy is independent: changing one section does not change the other', () => {
    s().addDancer('Maya')
    const maya = s().dancers[0].id
    const b = s().addPart()!
    s().assignDancer(firstSection(), maya, partA())
    const second = s().addSection()
    s().assignDancer(second, maya, b)
    expect(s().assignments[firstSection()][maya]).toBe(partA())
    expect(s().assignments[second][maya]).toBe(b)
  })

  it('renames a section', () => {
    s().renameSection(firstSection(), 'Intro')
    expect(s().sections[0].name).toBe('Intro')
  })

  it('moves a later section and keeps sections ordered', () => {
    const second = s().addSection()
    const third = s().addSection()
    s().setSectionStart(second, 40) // past the third (starts at 32)
    expect(s().sections.map((x) => x.id)).toEqual([firstSection(), third, second])
    expect(s().sections.map((x) => x.startCount)).toEqual([0, 32, 40])
  })

  it('never lets two sections start on the same count', () => {
    const second = s().addSection()
    const third = s().addSection()
    s().setSectionStart(third, 16)
    const starts = s().sections.map((x) => x.startCount)
    expect(new Set(starts).size).toBe(starts.length)
    expect(s().sections.find((x) => x.id === second)).toBeDefined()
  })

  it('pins the first section to count 0', () => {
    s().addSection()
    s().setSectionStart(firstSection(), 20)
    expect(s().sections[0].startCount).toBe(0)
  })

  it('does not let a later section be moved to count 0 (that is the first section’s spot)', () => {
    const second = s().addSection()
    s().setSectionStart(second, 0)
    expect(s().sections[0].id).toBe(firstSection())
    expect(s().sections.find((x) => x.id === second)!.startCount).toBeGreaterThanOrEqual(1)
  })

  it('removes a section and its assignments, and the next one then covers the gap', () => {
    s().addDancer('Maya')
    const maya = s().dancers[0].id
    const first = firstSection()
    const second = s().addSection()
    s().assignDancer(first, maya, partA())
    s().assignDancer(second, maya, partA())
    s().removeSection(first)
    expect(s().sections.map((x) => x.id)).toEqual([second])
    expect(s().sections[0].startCount).toBe(0)
    expect(s().assignments[first]).toBeUndefined()
    expect(s().assignments[second][maya]).toBe(partA())
  })

  it('never removes the last section', () => {
    s().removeSection(firstSection())
    expect(s().sections).toHaveLength(1)
  })
})

describe('assignments', () => {
  it('assigns and reassigns a dancer for a section', () => {
    s().addDancer('Maya')
    const maya = s().dancers[0].id
    const b = s().addPart()!
    s().assignDancer(firstSection(), maya, partA())
    expect(s().assignments[firstSection()][maya]).toBe(partA())
    s().assignDancer(firstSection(), maya, b)
    expect(s().assignments[firstSection()][maya]).toBe(b)
  })

  it('clears an assignment with null', () => {
    s().addDancer('Maya')
    const maya = s().dancers[0].id
    s().assignDancer(firstSection(), maya, partA())
    s().assignDancer(firstSection(), maya, null)
    expect(s().assignments[firstSection()]).toEqual({})
  })

  it('ignores an assignment to a part that does not exist', () => {
    s().addDancer('Maya')
    const maya = s().dancers[0].id
    s().assignDancer(firstSection(), maya, 'no-such-part')
    expect(s().assignments[firstSection()]?.[maya]).toBeUndefined()
  })

  it('a newly added dancer is unassigned, so they show up as a gap', () => {
    s().addDancer('Maya')
    expect(s().assignments[firstSection()]?.[s().dancers[0].id]).toBeUndefined()
    expect(findGaps(s().dancers, s().sections, s().assignments, s().parts)).toHaveLength(1)
  })

  it('removing a dancer removes their assignments in every section', () => {
    s().addDancer('Maya')
    s().addDancer('Jordan')
    const [maya, jordan] = s().dancers
    const second = s().addSection()
    s().assignDancer(firstSection(), maya.id, partA())
    s().assignDancer(firstSection(), jordan.id, partA())
    s().assignDancer(second, maya.id, partA())

    s().removeDancer(maya.id)

    expect(s().assignments[firstSection()]).toEqual({ [jordan.id]: partA() })
    expect(s().assignments[second]).toEqual({})
  })
})
