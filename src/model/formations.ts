import type { Formation, Point } from './types'

/** Keep a point inside the stage boundaries. */
export function clampToStage(p: Point, width: number, depth: number): Point {
  return {
    x: Math.min(Math.max(p.x, 0), width),
    y: Math.min(Math.max(p.y, 0), depth),
  }
}

/** Pick a starting spot for a newly added dancer: a loose row across the front. */
export function defaultSpot(index: number, width: number, depth: number): Point {
  const perRow = 8
  const row = Math.floor(index / perRow)
  const col = index % perRow
  const spacing = width / (perRow + 1)
  return clampToStage({ x: spacing * (col + 1), y: depth - 3 - row * 3 }, width, depth)
}

/**
 * Sort formations by count and make the counts strictly increasing, so two
 * formations never land on the same count. If a formation collides with the one
 * before it, it (and anything after) is pushed later by the minimum needed.
 * Ties keep their existing relative order.
 */
export function normalizeCounts(formations: Formation[]): Formation[] {
  const sorted = formations
    .map((f, i) => ({ f, i }))
    .sort((a, b) => a.f.count - b.f.count || a.i - b.i)
    .map(({ f }) => f)

  let last = -Infinity
  return sorted.map((f) => {
    const count = Math.max(Math.max(0, Math.round(f.count)), last + 1)
    last = count
    return count === f.count ? f : { ...f, count }
  })
}

/**
 * Which formation the playhead is in: the last one that has landed by `count`
 * (the same one `positionsAt` treats as the dancers' starting point), or the
 * first if none has yet. -1 when there are no formations. `formations` must be sorted by count.
 */
export function formationIndexAt(formations: Formation[], count: number): number {
  if (formations.length === 0) return -1
  let index = 0
  for (let i = 0; i < formations.length; i++) {
    if (formations[i].count <= count) index = i
    else break
  }
  return index
}

/**
 * Move one formation to a new place in the running order.
 *
 * The song's landing counts belong to the *slots*, not the formations: the
 * first slot keeps landing at its count whoever is in it. So the formation
 * content (name, positions, travel counts) moves and the counts stay where they
 * are. Dragging formation 4 to place 2 therefore doesn't change when anything
 * happens in the song, only which picture happens then.
 * `toIndex` is the position (0-based) the formation ends up in.
 * An unknown id, or a move to where it already is, returns the input unchanged.
 */
export function moveFormation(formations: Formation[], id: string, toIndex: number): Formation[] {
  const from = formations.findIndex((f) => f.id === id)
  const to = Math.min(Math.max(Math.round(toIndex), 0), formations.length - 1)
  if (from === -1 || from === to) return formations

  const reordered = [...formations]
  const [moved] = reordered.splice(from, 1)
  reordered.splice(to, 0, moved)
  return reordered.map((f, i) =>
    f.count === formations[i].count ? f : { ...f, count: formations[i].count },
  )
}
