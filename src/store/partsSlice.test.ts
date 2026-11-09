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
    expect(s().parts.map((p) => p.name)).toEqual(['Everyone'])
    expect(s().sections.map((x) => x.startCount)).toEqual([0])
    expect(s().assignments).toEqual({})
  })
})

describe('parts', () => {
  it('adds parts with the next letter and a distinct colour', () => {
    const id = s().addPart()
    expect(s().parts.map((p) => p.name)).toEqual(['Everyone', 'Part A'])
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
    const a = partA()
    const first = firstSection()
    const b = s().addPart()!
    s().addPart() // a third part, so two are still left (and dancers still need picking) after removing Part A
    const second = s().addSection()
    s().assignDancer(first, maya.id, a)
    s().assignDancer(first, jordan.id, b)
    s().assignDancer(second, maya.id, a)

    s().removePart(a)

    expect(s().parts.map((p) => p.id)).toContain(b)
    expect(s().parts.some((p) => p.id === a)).toBe(false)
    expect(s().assignments[first]).toEqual({ [jordan.id]: b })
    expect(s().assignments[second]).toEqual({})
    // Maya's part was removed in both sections, so she is now a gap in both.
    const gaps = findGaps(s().dancers, s().sections, s().assignments, s().parts)
    expect(gaps.filter((g) => g.dancerId === maya.id).map((g) => g.sectionId)).toEqual([first, second])
    // Jordan keeps Part B in the first section (the second was created before anyone was assigned).
    expect(gaps.some((g) => g.dancerId === jordan.id && g.sectionId === first)).toBe(false)
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

  it('with several parts, a newly added dancer is unassigned, so they show up as a gap', () => {
    s().addPart()
    s().addDancer('Maya')
    expect(s().assignments[firstSection()]?.[s().dancers[0].id]).toBeUndefined()
    expect(findGaps(s().dancers, s().sections, s().assignments, s().parts)).toHaveLength(1)
  })

  it('with only one part, a newly added dancer is in it automatically (no gap)', () => {
    s().addDancer('Maya')
    expect(findGaps(s().dancers, s().sections, s().assignments, s().parts)).toEqual([])
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

describe('limiting a part to specific sections', () => {
  // The choruses-only case: Part A everywhere, then Floor and Standing only in two sections.
  const setup = () => {
    const intro = firstSection()
    const chorus1 = s().addSection()
    const verse = s().addSection()
    const chorus2 = s().addSection()
    const floor = s().addPart()!
    const standing = s().addPart()!
    s().setPartSections(floor, [chorus1, chorus2])
    s().setPartSections(standing, [chorus1, chorus2])
    return { intro, chorus1, verse, chorus2, floor, standing }
  }

  it('a new part applies to all sections', () => {
    s().addPart()
    expect(s().parts.at(-1)!.sectionIds).toBeNull()
  })

  it('sets and clears the sections a part applies to', () => {
    const { chorus1, floor } = setup()
    s().setPartSections(floor, [chorus1])
    expect(s().parts.find((p) => p.id === floor)!.sectionIds).toEqual([chorus1])
    s().setPartSections(floor, null)
    expect(s().parts.find((p) => p.id === floor)!.sectionIds).toBeNull()
  })

  it('drops unknown section ids and duplicates', () => {
    const { chorus1, floor } = setup()
    s().setPartSections(floor, [chorus1, chorus1, 'no-such-section'])
    expect(s().parts.find((p) => p.id === floor)!.sectionIds).toEqual([chorus1])
  })

  it('removes no flags from the one-part sections, and none are needed there', () => {
    const { intro, verse, chorus1, chorus2 } = setup()
    s().addDancer('Maya')
    s().addDancer('Jordan')
    const gaps = findGaps(s().dancers, s().sections, s().assignments, s().parts)
    // Intro and Verse have only Part A, so everyone is in it. Only the choruses need choices.
    expect(gaps.every((g) => g.sectionId === chorus1 || g.sectionId === chorus2)).toBe(true)
    expect(gaps.some((g) => g.sectionId === intro || g.sectionId === verse)).toBe(false)
    expect(gaps).toHaveLength(4)
  })

  it('once the choruses are assigned there are no gaps at all', () => {
    const { chorus1, chorus2, floor, standing } = setup()
    s().addDancer('Maya')
    s().addDancer('Jordan')
    const [maya, jordan] = s().dancers
    s().assignDancer(chorus1, maya.id, floor)
    s().assignDancer(chorus1, jordan.id, standing)
    s().assignDancer(chorus2, maya.id, standing)
    s().assignDancer(chorus2, jordan.id, standing)
    expect(findGaps(s().dancers, s().sections, s().assignments, s().parts)).toEqual([])
  })

  it('only lets you choose a part that applies in that section', () => {
    const { intro, chorus1, floor } = setup()
    s().addDancer('Maya')
    const maya = s().dancers[0].id
    s().assignDancer(intro, maya, floor) // Floor does not apply in the intro
    expect(s().assignments[intro]?.[maya]).toBeUndefined()
    s().assignDancer(chorus1, maya, partA()) // Part A is replaced by Floor/Standing in chorus 1
    expect(s().assignments[chorus1]?.[maya]).toBeUndefined()
    s().assignDancer(chorus1, maya, floor)
    expect(s().assignments[chorus1][maya]).toBe(floor)
  })

  it('narrowing a part keeps earlier choices (ignored), and widening brings them back', () => {
    const { chorus1, chorus2, floor } = setup()
    s().addDancer('Maya')
    const maya = s().dancers[0].id
    s().assignDancer(chorus1, maya, floor)
    s().setPartSections(floor, [chorus2])
    expect(s().assignments[chorus1][maya]).toBe(floor) // still stored
    expect(findGaps(s().dancers, s().sections, s().assignments, s().parts).some((g) => g.sectionId === chorus1)).toBe(false)
    s().setPartSections(floor, [chorus1, chorus2])
    expect(findGaps(s().dancers, s().sections, s().assignments, s().parts).some((g) => g.dancerId === maya && g.sectionId === chorus1)).toBe(false)
  })

  it('a new section gets the same parts as the previous one (Chorus 3 after Chorus 2)', () => {
    const { chorus2, floor, standing } = setup()
    const sectionsBefore = s().sections.length
    const chorus3 = s().addSection() // added after the last section (chorus 2)
    expect(s().sections).toHaveLength(sectionsBefore + 1)
    expect(s().parts.find((p) => p.id === floor)!.sectionIds).toContain(chorus3)
    expect(s().parts.find((p) => p.id === standing)!.sectionIds).toContain(chorus3)
    expect(s().parts.find((p) => p.id === floor)!.sectionIds).toContain(chorus2)
  })

  it('a new section does not change parts that apply to all sections, or parts not in the previous section', () => {
    const { intro, floor } = setup()
    s().setPartSections(floor, [intro]) // floor is only in the intro; the last section (chorus 2) does not list it
    s().addSection()
    expect(s().parts[0].sectionIds).toBeNull()
    expect(s().parts.find((p) => p.id === floor)!.sectionIds).toEqual([intro])
  })

  it('removing a section removes it from every part that listed it', () => {
    const { chorus1, chorus2, floor } = setup()
    s().removeSection(chorus1)
    expect(s().parts.find((p) => p.id === floor)!.sectionIds).toEqual([chorus2])
  })

  it('a part left with no sections applies nowhere (it is not turned into "all sections")', () => {
    const { chorus1, chorus2, floor } = setup()
    s().setPartSections(floor, [chorus1])
    s().removeSection(chorus1)
    expect(s().parts.find((p) => p.id === floor)!.sectionIds).toEqual([])
    expect(chorus2).toBeDefined()
  })
})
