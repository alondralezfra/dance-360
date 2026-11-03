import { describe, expect, it } from 'vitest'
import { positionsAt } from './playback'
import type { Formation } from './types'

const f = (
  id: string,
  count: number,
  transitionCounts: number,
  x: number,
): Formation => ({
  id,
  name: id,
  count,
  transitionCounts,
  positions: { a: { x, y: 0 } },
})

// A at x=0 on count 0, x=10 on count 16 (4-count move), x=20 on count 24 (8-count move).
const formations = [f('f1', 0, 4, 0), f('f2', 16, 4, 10), f('f3', 24, 8, 20)]

describe('positionsAt', () => {
  it('returns nothing for an empty project', () => {
    expect(positionsAt([], 5)).toEqual({})
  })

  it('holds the first formation before and at its count', () => {
    expect(positionsAt(formations, -10).a.x).toBe(0)
    expect(positionsAt(formations, 0).a.x).toBe(0)
  })

  it('holds the previous formation until the transition starts', () => {
    expect(positionsAt(formations, 12).a.x).toBe(0) // f2 travel starts at 12
  })

  it('arrives exactly on the formation count', () => {
    expect(positionsAt(formations, 16).a.x).toBe(10)
    expect(positionsAt(formations, 24).a.x).toBe(20)
  })

  it('is halfway at the midpoint of a transition', () => {
    expect(positionsAt(formations, 14).a.x).toBeCloseTo(5)
  })

  it('moves monotonically through a transition', () => {
    let last = -Infinity
    for (let c = 12; c <= 16; c += 0.25) {
      const x = positionsAt(formations, c).a.x
      expect(x).toBeGreaterThanOrEqual(last)
      last = x
    }
  })

  it('holds the last formation afterwards', () => {
    expect(positionsAt(formations, 1000).a.x).toBe(20)
  })

  it('never starts travelling before the previous formation lands', () => {
    // 8-count transition into f3 would start at 16, exactly when f2 lands.
    expect(positionsAt(formations, 16).a.x).toBe(10)
    // A transition longer than the gap is clamped to the gap.
    const tight = [f('f1', 0, 4, 0), f('f2', 4, 100, 10)]
    expect(positionsAt(tight, 0).a.x).toBe(0)
    expect(positionsAt(tight, 2).a.x).toBeCloseTo(5)
  })

  it('handles a dancer missing from the previous formation', () => {
    const fs: Formation[] = [
      { id: 'f1', name: 'f1', count: 0, transitionCounts: 4, positions: {} },
      f('f2', 8, 4, 10),
    ]
    expect(positionsAt(fs, 6).a.x).toBe(10)
  })
})
