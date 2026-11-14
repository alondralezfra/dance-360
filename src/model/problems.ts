import { findGaps } from './parts'
import type { Project } from './types'

/** What a problem is about, so the screen can send the person to the place that fixes it. */
export type Problem =
  | { kind: 'no-part'; sectionId: string; message: string; detail: string }
  | { kind: 'not-placed'; formationId: string; message: string; detail: string }

/** How many names to list before "and N more". */
const NAMES_SHOWN = 6

function names(list: string[]): string {
  const shown = list.slice(0, NAMES_SHOWN).map((n) => n.trim() || 'Unnamed')
  const more = list.length - shown.length
  return more > 0 ? `${shown.join(', ')} and ${more} more` : shown.join(', ')
}

const dancersWord = (n: number) => (n === 1 ? '1 dancer' : `${n} dancers`)

/**
 * Things the director probably wants to fix, worked out fresh from the project each time (nothing is saved):
 * - dancers with no part in a section where they have to choose one (two or more parts apply there: a project that has
 *   not set up parts yet, or has only one, is not told every dancer is missing one);
 * - formations that do not place every dancer.
 * Sections come first, in song order, then formations in count order.
 */
export function findProblems(project: Pick<Project, 'dancers' | 'parts' | 'sections' | 'assignments' | 'formations'>): Problem[] {
  const { dancers, parts, sections, assignments, formations } = project
  const problems: Problem[] = []

  // The rule for "has to be in a part but is not" is findGaps (the Cast & Parts warnings use it too).
  const gaps = findGaps(dancers, sections, assignments, parts)
  for (const section of sections) {
    const without = dancers.filter((d) => gaps.some((g) => g.sectionId === section.id && g.dancerId === d.id))
    if (without.length === 0) continue
    problems.push({
      kind: 'no-part',
      sectionId: section.id,
      message: `${dancersWord(without.length)} ${without.length === 1 ? 'has' : 'have'} no part in ${section.name}`,
      detail: names(without.map((d) => d.name)),
    })
  }

  for (const formation of formations) {
    const missing = dancers.filter((d) => formation.positions[d.id] === undefined)
    if (missing.length === 0) continue
    problems.push({
      kind: 'not-placed',
      formationId: formation.id,
      message: `${formation.name} has ${dancers.length - missing.length} of ${dancers.length} dancers placed`,
      detail: `Not placed: ${names(missing.map((d) => d.name))}`,
    })
  }

  return problems
}
