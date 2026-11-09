import { describe, expect, it } from 'vitest'
import { placeFormationAt, tapToCount } from './tapSnap'
import type { Formation } from './types'

const f = (id: string, count: number): Formation => ({ id, name: id, count, transitionCounts: 4, positions: {} })
const tempo = { bpm: 120, startOffsetSec: 0, changes: [] } // 2 counts per second

describe('tapToCount', () => {
  it('snaps a tap time to the nearest whole count', () => {
    expect(tapToCount(4.1, tempo)).toBe(8) // 8.2 -> 8
    expect(tapToCount(4.4, tempo)).toBe(9) // 8.8 -> 9
  })

  it('is forgiving: taps either side of a count land on it', () => {
    expect(tapToCount(3.9, tempo)).toBe(8)
    expect(tapToCount(4.2, tempo)).toBe(8)
  })

  it('takes the tap latency off first (the tap is heard late)', () => {
    expect(tapToCount(4.3, tempo, 0.3)).toBe(8) // 4.0s of music -> count 8
    expect(tapToCount(4.3, tempo)).toBe(9) // without compensating it would be late
  })

  it('accounts for where the dance starts in the audio', () => {
    expect(tapToCount(5.5, { bpm: 120, startOffsetSec: 1.5, changes: [] })).toBe(8)
  })

  it('works at other tempos', () => {
    expect(tapToCount(5, { bpm: 96, startOffsetSec: 0, changes: [] })).toBe(8) // 5s * 1.6 counts/s
  })

  it('is never negative: a tap before the dance starts means count 0', () => {
    expect(tapToCount(0.2, { bpm: 120, startOffsetSec: 3, changes: [] })).toBe(0)
    expect(tapToCount(0, tempo, 1)).toBe(0)
  })
})

describe('placeFormationAt', () => {
  const list = () => [f('a', 0), f('b', 8), f('c', 16)]

  it('puts the formation on the count, keeping its place in the order', () => {
    const out = placeFormationAt(list(), 'b', 11)
    expect(out.map((x) => [x.id, x.count])).toEqual([['a', 0], ['b', 11], ['c', 16]])
  })

  it('pushes later formations on just enough to stay in order', () => {
    const out = placeFormationAt(list(), 'b', 16)
    expect(out.map((x) => [x.id, x.count])).toEqual([['a', 0], ['b', 16], ['c', 17]])
  })

  it('cannot land on or before the formation before it', () => {
    expect(placeFormationAt(list(), 'b', 0).map((x) => x.count)).toEqual([0, 1, 16])
    expect(placeFormationAt(list(), 'c', 3).map((x) => x.count)).toEqual([0, 8, 9])
  })

  it('the first formation can land as early as count 0, but not before', () => {
    expect(placeFormationAt(list(), 'a', -5).map((x) => x.count)).toEqual([0, 8, 16])
    expect(placeFormationAt([f('a', 4), f('b', 8)], 'a', 2).map((x) => x.count)).toEqual([2, 8])
  })

  it('rounds a fractional count', () => {
    expect(placeFormationAt(list(), 'b', 10.6).map((x) => x.count)).toEqual([0, 11, 16])
  })

  it('returns the same list when nothing changes, or the id is unknown', () => {
    const input = list()
    expect(placeFormationAt(input, 'b', 8)).toBe(input)
    expect(placeFormationAt(input, 'nope', 5)).toBe(input)
  })

  it('keeps everything else about the formation, and leaves the input alone', () => {
    const input = [f('a', 0), { ...f('b', 8), name: 'Cross', transitionCounts: 2, positions: { d: { x: 1, y: 2 } } }]
    const out = placeFormationAt(input, 'b', 12)
    expect(out[1]).toMatchObject({ name: 'Cross', transitionCounts: 2, positions: { d: { x: 1, y: 2 } } })
    expect(input[1].count).toBe(8)
  })

  it('placing the next formation tap by tap walks the dance forward', () => {
    let formations = [f('a', 0), f('b', 100), f('c', 200)]
    for (const [id, tapSec] of [['a', 0.1], ['b', 4.2], ['c', 8.1]] as const) {
      formations = placeFormationAt(formations, id, tapToCount(tapSec, tempo))
    }
    expect(formations.map((x) => x.count)).toEqual([0, 8, 16])
  })
})
