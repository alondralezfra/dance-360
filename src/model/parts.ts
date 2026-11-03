import { COUNTS_PER_SET } from './tempo'
import type { Assignments, Dancer, Id, Part, PartColorId, Section } from './types'

export const PART_COLOR_IDS: readonly PartColorId[] = [
  'blue',
  'red',
  'green',
  'orange',
  'sky',
  'pink',
  'yellow',
  'gray',
]

export const PART_COLOR_NAMES: Record<PartColorId, string> = {
  blue: 'Blue',
  red: 'Red',
  green: 'Green',
  orange: 'Orange',
  sky: 'Sky blue',
  pink: 'Pink',
  yellow: 'Yellow',
  gray: 'Gray',
}

/** One part per palette colour, so every part is visually distinct. */
export const MAX_PARTS = PART_COLOR_IDS.length

/** A new section starts this many counts after the previous one (two sets). */
export const DEFAULT_SECTION_LENGTH = COUNTS_PER_SET * 2

/** "Part A", "Part B", ... the first letter not already used by a part. */
export function nextPartName(parts: Part[]): string {
  const used = new Set(parts.map((p) => p.name))
  for (let i = 0; i < 26; i++) {
    const name = `Part ${String.fromCharCode(65 + i)}`
    if (!used.has(name)) return name
  }
  return `Part ${parts.length + 1}`
}

/** The first palette colour no part is using (cycling if somehow all are). */
export function nextPartColor(parts: Part[]): PartColorId {
  const used = new Set(parts.map((p) => p.color))
  return PART_COLOR_IDS.find((c) => !used.has(c)) ?? PART_COLOR_IDS[parts.length % PART_COLOR_IDS.length]
}

/**
 * Sort sections by start count and make them valid: the first starts at 0 and
 * every start is a whole number strictly after the previous one. A section that
 * collides with the one before is pushed later by the minimum needed.
 */
export function normalizeSections(sections: Section[]): Section[] {
  const sorted = sections
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s.startCount - b.s.startCount || a.i - b.i)
    .map(({ s }) => s)

  let last = -1
  return sorted.map((s, index) => {
    const start = index === 0 ? 0 : Math.max(Math.round(s.startCount), last + 1)
    last = start
    return start === s.startCount ? s : { ...s, startCount: start }
  })
}

/** Index of the section a count falls in (counts before the first belong to it). */
export function sectionIndexAt(sections: Section[], count: number): number {
  let index = 0
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].startCount <= count) index = i
    else break
  }
  return index
}

/** The count at which a section ends (where the next begins), or null for the last section. */
export function sectionEnd(sections: Section[], index: number): number | null {
  return sections[index + 1]?.startCount ?? null
}

/** The part a dancer is in at a given count, or undefined if they have none. */
export function partIdAt(
  sections: Section[],
  assignments: Assignments,
  dancerId: Id,
  count: number,
): Id | undefined {
  const section = sections[sectionIndexAt(sections, count)]
  return section ? assignments[section.id]?.[dancerId] : undefined
}

export interface AssignmentGap {
  dancerId: Id
  sectionId: Id
}

/**
 * Every (dancer, section) with no usable part: nothing assigned, or assigned to
 * a part that no longer exists. These are shown as warnings (plan §3.5).
 */
export function findGaps(
  dancers: Dancer[],
  sections: Section[],
  assignments: Assignments,
  parts: Part[],
): AssignmentGap[] {
  const partIds = new Set(parts.map((p) => p.id))
  const gaps: AssignmentGap[] = []
  for (const section of sections) {
    for (const dancer of dancers) {
      const partId = assignments[section.id]?.[dancer.id]
      if (!partId || !partIds.has(partId)) gaps.push({ dancerId: dancer.id, sectionId: section.id })
    }
  }
  return gaps
}
