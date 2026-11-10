import { describe, expect, it } from 'vitest'
import { clicksBetween } from './metronome'

const tempo = (bpm: number, startOffsetSec = 0) => ({ bpm, startOffsetSec, changes: [] })

describe('clicksBetween', () => {
  it('has one click per count, with the first count of each set accented', () => {
    const clicks = clicksBetween(tempo(120), 0, 5) // 2 counts a second
    expect(clicks.map((c) => c.count)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(clicks.map((c) => c.sec)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5])
    expect(clicks.filter((c) => c.accent).map((c) => c.count)).toEqual([0, 8])
  })

  it('includes a click exactly at the start of the stretch and leaves out one exactly at the end', () => {
    expect(clicksBetween(tempo(120), 1, 2).map((c) => c.count)).toEqual([2, 3])
  })

  it('consecutive stretches never skip or repeat a click', () => {
    const t = tempo(127.5, 1.37)
    const whole = clicksBetween(t, 0, 30).map((c) => c.count)
    const pieces = [0, 0.1, 0.35, 3.3, 3.31, 9, 17.77, 30]
    const stitched = pieces.slice(1).flatMap((to, i) => clicksBetween(t, pieces[i], to).map((c) => c.count))
    expect(stitched).toEqual(whole)
  })

  it('starts the counts at the start point, not at the start of the song', () => {
    const clicks = clicksBetween(tempo(120, 2), 0, 4)
    expect(clicks[0]).toMatchObject({ count: 0, sec: 2, accent: true })
    expect(clicks.map((c) => c.sec)).toEqual([2, 2.5, 3, 3.5])
  })

  it('has no clicks before count 0, and no clicks for an empty or backwards stretch', () => {
    expect(clicksBetween(tempo(120, 5), 0, 4)).toEqual([])
    expect(clicksBetween(tempo(120), 3, 3)).toEqual([])
    expect(clicksBetween(tempo(120), 4, 1)).toEqual([])
  })

  it('works at other tempos, including fractions', () => {
    const clicks = clicksBetween(tempo(90), 0, 2) // 1.5 counts a second
    expect(clicks.map((c) => c.count)).toEqual([0, 1, 2])
    expect(clicks[1].sec).toBeCloseTo(60 / 90)
    const odd = clicksBetween(tempo(127.5), 10, 12)
    odd.forEach((c) => expect(c.sec).toBeCloseTo((c.count * 60) / 127.5))
  })

  it('accents every eighth count however far into the song', () => {
    const clicks = clicksBetween(tempo(120), 200, 210)
    clicks.forEach((c) => expect(c.accent).toBe(c.count % 8 === 0))
    expect(clicks.some((c) => c.accent)).toBe(true)
  })

  it('refuses a nonsense tempo instead of looping, and caps a huge stretch', () => {
    expect(clicksBetween(tempo(0), 0, 10)).toEqual([])
    expect(clicksBetween(tempo(-5), 0, 10)).toEqual([])
    expect(clicksBetween(tempo(Number.NaN), 0, 10)).toEqual([])
    expect(clicksBetween(tempo(300), 0, 1_000_000).length).toBeLessThanOrEqual(2000)
  })
})
