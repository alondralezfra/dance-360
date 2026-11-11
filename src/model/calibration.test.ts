import { describe, expect, it } from 'vitest'
import {
  CLICK_COUNT,
  CLICK_LEAD_SEC,
  CLICK_SPACING_SEC,
  MAX_SPEAKER_DELAY_MS,
  clickTimes,
  clickTrackLength,
  clickTrackSamples,
  estimateSpeakerDelay,
} from './calibration'

const taps = (delaySec: number, which = clickTimes()) => which.map((c) => c + delaySec)

describe('the click track', () => {
  it('has evenly spaced clicks after a lead-in', () => {
    const times = clickTimes()
    expect(times).toHaveLength(CLICK_COUNT)
    expect(times[0]).toBe(CLICK_LEAD_SEC)
    expect(times[1] - times[0]).toBeCloseTo(CLICK_SPACING_SEC)
  })

  it('is long enough to hold the last click', () => {
    expect(clickTrackLength()).toBeGreaterThan(clickTimes().at(-1)!)
  })

  it('makes a blip at each click and silence between them', () => {
    const rate = 8000
    const samples = clickTrackSamples(rate)
    expect(samples.length).toBe(Math.ceil(clickTrackLength() * rate))
    const loud = (from: number, to: number) => Math.max(...samples.slice(Math.round(from * rate), Math.round(to * rate)).map(Math.abs))
    expect(loud(0, CLICK_LEAD_SEC - 0.01)).toBe(0) // the lead-in is silent
    expect(loud(clickTimes()[3], clickTimes()[3] + 0.02)).toBeGreaterThan(0.3)
    expect(loud(clickTimes()[3] + 0.1, clickTimes()[4] - 0.01)).toBe(0)
    expect(Math.max(...samples)).toBeLessThanOrEqual(1) // never clips
  })
})

describe('estimateSpeakerDelay', () => {
  it('reads the delay off taps that follow every click', () => {
    expect(estimateSpeakerDelay(taps(0.18))).toBe(180)
    expect(estimateSpeakerDelay(taps(0.3))).toBe(300)
  })

  it('uses the median, so a stray tap cannot skew it', () => {
    const t = taps(0.2)
    t[4] += 0.25
    t[7] -= 0.1
    expect(estimateSpeakerDelay(t)).toBe(200)
  })

  it('ignores taps that are nowhere near a click, and still answers if enough are good', () => {
    const t = [...taps(0.2), 0.2, clickTimes()[2] + 0.45] // one before the first click, one half way to the next
    expect(estimateSpeakerDelay(t)).toBe(200)
  })

  it('says it could not tell when too few taps match', () => {
    expect(estimateSpeakerDelay(taps(0.2).slice(0, 4))).toBeNull()
    expect(estimateSpeakerDelay([])).toBeNull()
    expect(estimateSpeakerDelay(taps(0.2).map((t) => t + 0.35))).toBeNull() // every tap too late to count
  })

  it('never goes below zero when someone taps slightly ahead of the beat', () => {
    expect(estimateSpeakerDelay(taps(-0.05))).toBe(0)
  })

  it('never goes above the most delay the app uses', () => {
    expect(MAX_SPEAKER_DELAY_MS).toBe(1000)
    expect(estimateSpeakerDelay(taps(0.36))).toBe(360)
  })
})
