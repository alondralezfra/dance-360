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

/**
 * The parts that apply in a section. A part limited to specific sections
 * REPLACES the all-sections parts in those sections (so "Floor" and "Standing"
 * in the choruses take over from "Part A", which applies everywhere else).
 */
export function availableParts(parts: Part[], sectionId: Id): Part[] {
  const specific = parts.filter((p) => p.sectionIds !== null && p.sectionIds.includes(sectionId))
  return specific.length > 0 ? specific : parts.filter((p) => p.sectionIds === null)
}

/**
 * The part a dancer is in for a section, or undefined if they have none.
 * - If only one part applies in the section, everyone is in it automatically.
 * - Otherwise it's their chosen part, as long as that part still applies there
 *   (a stored choice for a part that no longer applies is kept but ignored, so
 *   widening the part's sections again brings it back).
 */
export function effectivePartId(
  parts: Part[],
  assignments: Assignments,
  sectionId: Id,
  dancerId: Id,
): Id | undefined {
  const available = availableParts(parts, sectionId)
  if (available.length === 1) return available[0].id
  const chosen = assignments[sectionId]?.[dancerId]
  return available.some((p) => p.id === chosen) ? chosen : undefined
}

/** The part a dancer is in at a given count, or undefined if they have none. */
export function partIdAt(
  sections: Section[],
  parts: Part[],
  assignments: Assignments,
  dancerId: Id,
  count: number,
): Id | undefined {
  const section = sections[sectionIndexAt(sections, count)]
  return section ? effectivePartId(parts, assignments, section.id, dancerId) : undefined
}

/**
 * The next value of a part's sections after ticking or unticking one section
 * in the checklist. Ticking a section while the part is on "all sections"
 * narrows it to just that section; unticking the last one goes back to all.
 */
export function toggleSectionInScope(sectionIds: Id[] | null, sectionId: Id): Id[] | null {
  if (sectionIds === null) return [sectionId]
  if (sectionIds.includes(sectionId)) {
    const rest = sectionIds.filter((id) => id !== sectionId)
    return rest.length > 0 ? rest : null
  }
  return [...sectionIds, sectionId]
}

/** "All sections", "No sections", or the chosen section names in song order. */
export function sectionScopeLabel(sectionIds: Id[] | null, sections: Section[]): string {
  if (sectionIds === null) return 'All sections'
  const names = sections.filter((s) => sectionIds.includes(s.id)).map((s) => s.name)
  return names.length > 0 ? names.join(', ') : 'No sections'
}

export interface AssignmentGap {
  dancerId: Id
  sectionId: Id
}

/**
 * True when no part applies in a section. That is not a problem: it just means
 * the dance isn't split there, so everyone dances together.
 */
export function isUncovered(parts: Part[], sectionId: Id): boolean {
  return availableParts(parts, sectionId).length === 0
}

/**
 * Every (dancer, section) where a dancer has to be put in a part but hasn't been.
 * That only happens where two or more parts apply and the dancer has no valid
 * choice. It is NOT a gap where one part applies (everyone is in it
 * automatically) or none applies (everyone dances together). These are shown as
 * warnings (plan §3.5).
 */
export function findGaps(
  dancers: Dancer[],
  sections: Section[],
  assignments: Assignments,
  parts: Part[],
): AssignmentGap[] {
  const gaps: AssignmentGap[] = []
  for (const section of sections) {
    if (availableParts(parts, section.id).length < 2) continue
    for (const dancer of dancers) {
      if (effectivePartId(parts, assignments, section.id, dancer.id) === undefined) {
        gaps.push({ dancerId: dancer.id, sectionId: section.id })
      }
    }
  }
  return gaps
}
