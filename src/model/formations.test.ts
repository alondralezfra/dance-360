import { describe, expect, it } from 'vitest'
import { clampToStage, defaultSpot, formationIndexAt, moveFormation, normalizeCounts } from './formations'
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

describe('moveFormation', () => {
  const abc = () => [f('a', 0), f('b', 8), f('c', 24)]

  it('moves content into the new place while the counts stay in their slots', () => {
    const out = moveFormation(abc(), 'c', 0)
    expect(out.map((x) => x.id)).toEqual(['c', 'a', 'b'])
    expect(out.map((x) => x.count)).toEqual([0, 8, 24])
  })

  it('moves later too', () => {
    const out = moveFormation(abc(), 'a', 2)
    expect(out.map((x) => x.id)).toEqual(['b', 'c', 'a'])
    expect(out.map((x) => x.count)).toEqual([0, 8, 24])
  })

  it('keeps each formation its own name, positions and travel counts', () => {
    const input = [
      { ...f('a', 0), transitionCounts: 2, positions: { d: { x: 1, y: 1 } } },
      { ...f('b', 8), transitionCounts: 6 },
    ]
    const out = moveFormation(input, 'a', 1)
    expect(out[1]).toMatchObject({ id: 'a', count: 8, transitionCounts: 2, positions: { d: { x: 1, y: 1 } } })
    expect(out[0]).toMatchObject({ id: 'b', count: 0, transitionCounts: 6 })
  })

  it('leaves the input untouched', () => {
    const input = abc()
    moveFormation(input, 'c', 0)
    expect(input.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('returns the same list for no-op moves and unknown ids', () => {
    const input = abc()
    expect(moveFormation(input, 'b', 1)).toBe(input)
    expect(moveFormation(input, 'nope', 0)).toBe(input)
  })

  it('clamps an out-of-range target to the ends', () => {
    expect(moveFormation(abc(), 'a', 99).map((x) => x.id)).toEqual(['b', 'c', 'a'])
    expect(moveFormation(abc(), 'c', -5).map((x) => x.id)).toEqual(['c', 'a', 'b'])
  })

  it('does nothing with a single formation', () => {
    const one = [f('a', 0)]
    expect(moveFormation(one, 'a', 3)).toBe(one)
  })

  it('produces counts that normalizeCounts leaves alone', () => {
    const out = moveFormation(abc(), 'c', 1)
    expect(normalizeCounts(out)).toEqual(out)
  })
})

describe('formationIndexAt', () => {
  const list = [f('a', 0), f('b', 16), f('c', 40)]

  it('is the last formation that has landed by that count', () => {
    expect(formationIndexAt(list, 0)).toBe(0)
    expect(formationIndexAt(list, 15.9)).toBe(0)
    expect(formationIndexAt(list, 16)).toBe(1) // landing exactly counts as landed
    expect(formationIndexAt(list, 39)).toBe(1)
    expect(formationIndexAt(list, 40)).toBe(2)
    expect(formationIndexAt(list, 9999)).toBe(2)
  })

  it('is the first formation before any has landed (the dancers hold it)', () => {
    expect(formationIndexAt([f('a', 8), f('b', 16)], 3)).toBe(0)
    expect(formationIndexAt(list, -12)).toBe(0)
  })

  it('is -1 when there are no formations', () => {
    expect(formationIndexAt([], 5)).toBe(-1)
  })

  it('agrees with where positionsAt says the dancers have come from', () => {
    for (const count of [0, 10, 16, 20, 40, 100]) {
      const i = formationIndexAt(list, count)
      expect(list[i].count <= count || i === 0).toBe(true)
      if (list[i + 1]) expect(list[i + 1].count > count).toBe(true)
    }
  })
})
