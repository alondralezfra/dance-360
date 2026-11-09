import { describe, expect, it } from 'vitest'
import { levelBetween, peaksDuration, peaksFromChannels, PEAKS_PER_SECOND, type Peaks } from './peaks'

const channel = (...values: number[]) => Float32Array.from(values)

describe('peaksFromChannels', () => {
  it('takes the loudest sample in each slice, scaled so the loudest slice is 255', () => {
    // sampleRate 4, perSecond 2 -> 2 samples per slice
    const peaks = peaksFromChannels([channel(0.1, -0.2, 0.5, 0.25, 0, 0)], 4, 2)
    expect(peaks.perSecond).toBe(2)
    expect(Array.from(peaks.data)).toEqual([102, 255, 0]) // 0.2/0.5, 0.5/0.5, silence
  })

  it('uses absolute values, so negative swings count', () => {
    expect(Array.from(peaksFromChannels([channel(-1, 0)], 2, 1).data)).toEqual([255])
  })

  it('takes the loudest across channels', () => {
    expect(Array.from(peaksFromChannels([channel(0.2, 0.2), channel(0.8, 0.1)], 2, 1).data)).toEqual([255])
    const two = peaksFromChannels([channel(0.2, 0, 0, 0), channel(0, 0, 0.8, 0)], 2, 1)
    expect(Array.from(two.data)).toEqual([64, 255])
  })

  it('rounds the last, partial slice up instead of dropping it', () => {
    const peaks = peaksFromChannels([channel(0, 0, 0, 0, 1)], 4, 2) // 5 samples = 3 slices
    expect(peaks.data).toHaveLength(3)
    expect(peaks.data[2]).toBe(255)
  })

  it('shows a quiet recording at full scale', () => {
    expect(Array.from(peaksFromChannels([channel(0.001, 0.0005)], 2, 1).data)).toEqual([255])
  })

  it('gives all zeros for silence, without dividing by zero', () => {
    expect(Array.from(peaksFromChannels([channel(0, 0, 0, 0)], 2, 1).data)).toEqual([0, 0])
  })

  it('uses the longest channel when lengths differ', () => {
    expect(peaksFromChannels([channel(1, 1), channel(1, 1, 1, 1)], 2, 1).data).toHaveLength(2)
  })

  it('copes with bad input: no channels, no samples, or a bad rate', () => {
    expect(peaksFromChannels([], 44100).data).toHaveLength(0)
    expect(peaksFromChannels([new Float32Array(0)], 44100).data).toHaveLength(0)
    expect(peaksFromChannels([channel(1)], 0).data).toHaveLength(0)
    expect(peaksFromChannels([channel(1)], NaN).data).toHaveLength(0)
    expect(peaksFromChannels([channel(1)], 100, 0).data).toHaveLength(0)
  })

  it('defaults to PEAKS_PER_SECOND and a sensible size for a real song', () => {
    const peaks = peaksFromChannels([new Float32Array(8000 * 3).fill(0.5)], 8000) // 3s at 8kHz
    expect(peaks.perSecond).toBe(PEAKS_PER_SECOND)
    expect(peaks.data).toHaveLength(300)
  })
})

describe('peaksDuration and levelBetween', () => {
  const peaks: Peaks = { perSecond: 2, data: Uint8Array.from([0, 51, 255, 102]) } // 2 seconds

  it('reports the duration', () => {
    expect(peaksDuration(peaks)).toBe(2)
    expect(peaksDuration({ perSecond: 100, data: new Uint8Array(0) })).toBe(0)
  })

  it('is the loudest slice overlapping the stretch of time, as 0 to 1', () => {
    expect(levelBetween(peaks, 0, 0.5)).toBe(0)
    expect(levelBetween(peaks, 0.5, 1)).toBeCloseTo(51 / 255)
    expect(levelBetween(peaks, 0, 2)).toBe(1)
    expect(levelBetween(peaks, 1.5, 2)).toBeCloseTo(102 / 255)
  })

  it('covers a stretch that straddles slices', () => {
    expect(levelBetween(peaks, 0.4, 1.1)).toBe(1) // touches slices 0..2
  })

  it('is 0 outside the song and for an empty song', () => {
    expect(levelBetween(peaks, 5, 6)).toBe(0)
    expect(levelBetween(peaks, -3, -1)).toBe(0)
    expect(levelBetween({ perSecond: 100, data: new Uint8Array(0) }, 0, 1)).toBe(0)
  })

  it('clamps a stretch that runs off either end', () => {
    expect(levelBetween(peaks, -1, 0.4)).toBe(0)
    expect(levelBetween(peaks, 1.4, 10)).toBe(1)
  })

  it('a point in time (start equals end) reads the slice it falls in', () => {
    expect(levelBetween(peaks, 1.2, 1.2)).toBe(1)
  })
})
