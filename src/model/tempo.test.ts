import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TEMPO,
  countToSeconds,
  isDefaultTempo,
  formatCount,
  fromSetAndCount,
  secondsToCount,
  snapToCount,
  toSetAndCount,
} from './tempo'

const tempo = { bpm: 120, startOffsetSec: 1.5, changes: [] }

describe('tempo map', () => {
  it('converts counts to seconds', () => {
    expect(countToSeconds(0, tempo)).toBe(1.5)
    expect(countToSeconds(8, tempo)).toBe(5.5) // 8 counts at 120bpm = 4s
  })

  it('round-trips seconds and counts', () => {
    for (const c of [0, 3, 8.5, 64]) {
      expect(secondsToCount(countToSeconds(c, tempo), tempo)).toBeCloseTo(c)
    }
  })

  it('is negative before the dance starts', () => {
    expect(secondsToCount(0, tempo)).toBeLessThan(0)
  })

  it('shifting the start offset shifts every count (counts are the source of truth)', () => {
    const shifted = { ...tempo, startOffsetSec: 2 }
    expect(countToSeconds(16, shifted) - countToSeconds(16, tempo)).toBeCloseTo(0.5)
  })
})

describe('isDefaultTempo', () => {
  it('is true for a tempo nobody has touched', () => {
    expect(isDefaultTempo(DEFAULT_TEMPO)).toBe(true)
    expect(isDefaultTempo({ bpm: 120, startOffsetSec: 0, changes: [] })).toBe(true)
  })

  it('is false as soon as the BPM or the start point has been set', () => {
    expect(isDefaultTempo({ bpm: 128, startOffsetSec: 0, changes: [] })).toBe(false)
    expect(isDefaultTempo({ bpm: 120, startOffsetSec: 1.5, changes: [] })).toBe(false)
  })

  it('is false if there are tempo changes', () => {
    expect(isDefaultTempo({ bpm: 120, startOffsetSec: 0, changes: [{ atCount: 64, bpm: 140 }] })).toBe(false)
  })
})

describe('count labels', () => {
  it('maps absolute counts to set and count', () => {
    expect(toSetAndCount(0)).toEqual({ set: 1, count: 1 })
    expect(toSetAndCount(7)).toEqual({ set: 1, count: 8 })
    expect(toSetAndCount(8)).toEqual({ set: 2, count: 1 })
    expect(toSetAndCount(20)).toEqual({ set: 3, count: 5 })
  })

  it('formats for display', () => {
    expect(formatCount(20)).toBe('Set 3 · Count 5')
  })

  it('snaps to the nearest count', () => {
    expect(snapToCount(4.4)).toBe(4)
    expect(snapToCount(4.6)).toBe(5)
  })
})

describe('fromSetAndCount', () => {
  it('turns a 1-based set and count into an absolute count', () => {
    expect(fromSetAndCount(1, 1)).toBe(0)
    expect(fromSetAndCount(1, 8)).toBe(7)
    expect(fromSetAndCount(2, 1)).toBe(8)
    expect(fromSetAndCount(3, 5)).toBe(20)
  })

  it('is the inverse of toSetAndCount', () => {
    for (const count of [0, 1, 7, 8, 9, 23, 64, 255]) {
      const { set, count: c } = toSetAndCount(count)
      expect(fromSetAndCount(set, c)).toBe(count)
    }
  })
})
