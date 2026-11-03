import type { Formation, Id, Point } from './types'

// The playback engine: a pure function from (formations, count) to positions.
// It knows nothing about React, canvases or audio. The editor, phone watch
// mode and the future dancer view all render whatever this returns, and
// anything that can produce a count (audio clock, scrubber, glide animation)
// can drive it.

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/** The count at which travel toward `formation` begins, never before the previous one lands. */
export function transitionStart(formation: Formation, previous: Formation): number {
  return Math.max(formation.count - formation.transitionCounts, previous.count)
}

function lerp(a: Point, b: Point, k: number): Point {
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
}

/**
 * Where every dancer is at a given count.
 * - Before the first formation, dancers hold the first formation.
 * - A formation is reached ON its count; they travel during `transitionCounts`
 *   counts beforehand (never starting before the previous formation lands).
 * - After the last formation, dancers hold it.
 * `formations` must be sorted by `count`.
 */
export function positionsAt(
  formations: Formation[],
  count: number,
): Record<Id, Point> {
  if (formations.length === 0) return {}

  // Last formation that has already landed (or the first one, if none has).
  let prevIndex = 0
  for (let i = 0; i < formations.length; i++) {
    if (formations[i].count <= count) prevIndex = i
    else break
  }
  const prev = formations[prevIndex]
  const next = formations[prevIndex + 1]
  if (!next || count <= prev.count) return prev.positions

  const start = transitionStart(next, prev)
  if (count <= start) return prev.positions

  const k = easeInOut((count - start) / (next.count - start))
  const result: Record<Id, Point> = {}
  for (const id of Object.keys(next.positions)) {
    const to = next.positions[id]
    const from = prev.positions[id] ?? to
    result[id] = lerp(from, to, k)
  }
  return result
}
