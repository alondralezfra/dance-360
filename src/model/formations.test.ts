import { describe, expect, it } from 'vitest'
import { clampToStage, defaultSpot, normalizeCounts } from './formations'
import type { Formation } from './types'

const f = (id: string, count: number): Formation => ({
  id,
  name: id,
  count,
  transitionCounts: 4,
  positions: {},
})

describe('normalizeCounts', () => {
  it('sorts by count', () => {
    expect(normalizeCounts([f('b', 16), f('a', 0)]).map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('pushes colliding formations later, rippling forward only as needed', () => {
    const out = normalizeCounts([f('a', 8), f('b', 8), f('c', 9), f('d', 40)])
    expect(out.map((x) => x.count)).toEqual([8, 9, 10, 40])
  })

  it('clamps negatives to zero and rounds fractions', () => {
    expect(normalizeCounts([f('a', -3), f('b', 4.6)]).map((x) => x.count)).toEqual([0, 5])
  })

  it('does not copy formations that are already fine', () => {
    const a = f('a', 0)
    expect(normalizeCounts([a])[0]).toBe(a)
  })
})

describe('stage helpers', () => {
  it('clamps points inside the stage', () => {
    expect(clampToStage({ x: -5, y: 99 }, 40, 24)).toEqual({ x: 0, y: 24 })
  })

  it('places new dancers inside the stage, in rows', () => {
    const first = defaultSpot(0, 40, 24)
    const ninth = defaultSpot(8, 40, 24)
    expect(first.y).toBeGreaterThan(ninth.y) // second row is further upstage
    for (let i = 0; i < 30; i++) {
      const p = defaultSpot(i, 40, 24)
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeGreaterThanOrEqual(0)
    }
  })
})
