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
