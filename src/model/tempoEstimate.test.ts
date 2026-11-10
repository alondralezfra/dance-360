import { describe, expect, it } from 'vitest'
import { beatTrack, steadyTone, whiteNoise } from '../test/syntheticAudio'
import { estimateTempo, estimateTempoFromSamples, MIN_CONFIDENCE, onsetStrength } from './tempoEstimate'

const SR = 8000
const estimate = (samples: Float32Array) => estimateTempoFromSamples([samples], SR)

describe('onsetStrength', () => {
  it('has a value every 10 ms and never goes negative', () => {
    const { envelope, rate } = onsetStrength(beatTrack({ bpm: 120, seconds: 5 }), SR)
    expect(rate).toBeCloseTo(100)
    expect(envelope.length).toBeGreaterThan(480)
    expect(envelope.length).toBeLessThanOrEqual(500)
    expect(Math.min(...envelope)).toBeGreaterThanOrEqual(0)
  })

  it('is high where something starts and near zero in between', () => {
    // one beat every second, starting at 1.0 s
    const { envelope, rate, offsetSec } = onsetStrength(beatTrack({ bpm: 60, seconds: 5, firstBeatSec: 1, hats: false, snare: false }), SR)
    const at = (sec: number) => Math.round((sec - offsetSec) * rate)
    const onBeat = Math.max(...envelope.slice(at(1) - 3, at(1) + 4))
    const between = Math.max(...envelope.slice(at(1.4), at(1.9)))
    expect(onBeat).toBeGreaterThan(between * 5)
  })

  it('shows a steady tone as having no onsets once it has started', () => {
    const { envelope, rate } = onsetStrength(steadyTone(5), SR)
    expect(Math.max(...envelope.slice(Math.round(0.3 * rate)))).toBeLessThan(0.05)
  })

  it('copes with audio shorter than one analysis window, and a bad rate', () => {
    expect(onsetStrength(new Float32Array(100), SR).envelope).toHaveLength(0)
    expect(onsetStrength(new Float32Array(1000), 0).envelope).toHaveLength(0)
    expect(onsetStrength(new Float32Array(0), SR).envelope).toHaveLength(0)
  })

  it('handles other sample rates (the window scales with the rate)', () => {
    const { envelope, rate } = onsetStrength(beatTrack({ bpm: 120, seconds: 4, sampleRate: 44100 }), 44100)
    expect(rate).toBeCloseTo(100, 0)
    expect(envelope.length).toBeGreaterThan(300)
  })
})

describe('estimateTempo on music with a steady beat', () => {
  it.each([90, 100, 110, 120, 128, 135, 140, 150, 160])('finds %i BPM to within a quarter of a BPM', (bpm) => {
    const result = estimate(beatTrack({ bpm, seconds: 40 }))!
    expect(result.bpm).toBeCloseTo(bpm, 0)
    expect(Math.abs(result.bpm - bpm)).toBeLessThan(0.25)
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('finds a tempo that is not a whole number', () => {
    const result = estimate(beatTrack({ bpm: 127.5, seconds: 60 }))!
    expect(Math.abs(result.bpm - 127.5)).toBeLessThan(0.2)
  })

  it('is precise enough that the beat grid stays on the music for four minutes', () => {
    const bpm = 123.4
    const result = estimate(beatTrack({ bpm, seconds: 240 }))!
    const drift = (Math.abs(result.bpm - bpm) / bpm) * 240 // seconds off by the end
    expect(drift).toBeLessThan(0.15)
  })

  it('finds where the first beat lands (a sound at the very first instant cannot be seen starting)', () => {
    for (const first of [0.25, 0.5, 0.777, 1.234]) {
      const result = estimate(beatTrack({ bpm: 128, seconds: 30, firstBeatSec: first }))!
      expect(Math.abs(result.firstBeatSec - first)).toBeLessThan(0.02)
    }
  })

  it('skips a quiet intro and reports where the beat really starts', () => {
    const result = estimate(beatTrack({ bpm: 120, seconds: 40, silentIntroSec: 4.2, firstBeatSec: 0.1 }))!
    expect(result.bpm).toBeCloseTo(120, 0)
    // the beats start at the first grid position after 4.2 s: 0.1 + 9 * 0.5 = 4.6
    expect(result.firstBeatSec).toBeGreaterThan(4.2)
    expect(Math.abs(result.firstBeatSec - 4.6)).toBeLessThan(0.05)
  })

  it('copes with a live player who is a little off the beat each time', () => {
    const result = estimate(beatTrack({ bpm: 118, seconds: 60, jitterSec: 0.012 }))!
    expect(Math.abs(result.bpm - 118)).toBeLessThan(0.6)
  })

  it('still works with background noise', () => {
    const result = estimate(beatTrack({ bpm: 128, seconds: 40, noise: 0.15 }))!
    expect(Math.abs(result.bpm - 128)).toBeLessThan(0.5)
  })

  it('works without hats or snare, from the kick alone', () => {
    const result = estimate(beatTrack({ bpm: 126, seconds: 40, hats: false, snare: false }))!
    expect(Math.abs(result.bpm - 126)).toBeLessThan(0.3)
  })

  it('averages stereo channels', () => {
    const left = beatTrack({ bpm: 132, seconds: 30 })
    const result = estimateTempoFromSamples([left, left.map((v) => v * 0.8)], SR)!
    expect(Math.abs(result.bpm - 132)).toBeLessThan(0.3)
  })

  it('reports a slow song at a tempo that is either right or double (the person can halve it)', () => {
    const result = estimate(beatTrack({ bpm: 70, seconds: 60 }))!
    const ratio = result.bpm / 70
    expect([1, 2].some((k) => Math.abs(ratio - k) < 0.01)).toBe(true)
  })

  it('keeps every answer within the supported range', () => {
    for (const bpm of [64, 75, 100, 180]) {
      const result = estimate(beatTrack({ bpm, seconds: 40 }))!
      expect(result.bpm).toBeGreaterThanOrEqual(60 - 3)
      expect(result.bpm).toBeLessThanOrEqual(200 + 3)
    }
  })
})

describe('estimateTempo when there is no clear beat', () => {
  it('is not sure about noise', () => {
    const result = estimate(whiteNoise(30))
    expect(result === null || result.confidence < MIN_CONFIDENCE).toBe(true)
  })

  it('finds nothing in a steady tone', () => {
    const result = estimate(steadyTone(30))
    expect(result === null || result.confidence < MIN_CONFIDENCE).toBe(true)
  })

  it('is not fooled by one loud moment in an otherwise empty song', () => {
    const samples = new Float32Array(SR * 30)
    samples.set(beatTrack({ bpm: 120, seconds: 1, hats: false, snare: false }), SR * 2) // a single kick at 2 s
    const result = estimate(samples)
    expect(result === null || result.confidence < MIN_CONFIDENCE).toBe(true)
  })

  it('finds nothing in silence', () => {
    expect(estimate(new Float32Array(SR * 30))).toBeNull()
  })

  it('needs enough audio to tell', () => {
    expect(estimate(beatTrack({ bpm: 120, seconds: 5 }))).toBeNull()
    expect(estimateTempoFromSamples([], SR)).toBeNull()
    expect(estimateTempoFromSamples([new Float32Array(0)], SR)).toBeNull()
  })

  it('returns null for an empty curve', () => {
    expect(estimateTempo({ envelope: new Float32Array(0), rate: 100, offsetSec: 0 })).toBeNull()
  })

  it('says so for beats that wander so much there is no steady tempo', () => {
    const result = estimate(beatTrack({ bpm: 120, seconds: 40, jitterSec: 0.2 }))
    expect(result === null || result.confidence < 0.9).toBe(true)
  })

  it('is much less sure than for real beats', () => {
    const beats = estimate(beatTrack({ bpm: 128, seconds: 40 }))!
    const noise = estimate(whiteNoise(40))
    expect(beats.confidence).toBeGreaterThan((noise?.confidence ?? 0) + 0.4)
  })
})

describe('estimateTempo in practice', () => {
  it('gives the same answer every time for the same audio', () => {
    const track = beatTrack({ bpm: 124, seconds: 30 })
    expect(estimate(track)).toEqual(estimate(track))
  })

  it('analyses a four-minute song quickly enough to run when a file is attached', () => {
    const track = beatTrack({ bpm: 128, seconds: 240 })
    const started = performance.now()
    const result = estimate(track)!
    const took = performance.now() - started
    expect(Math.abs(result.bpm - 128)).toBeLessThan(0.2)
    expect(took).toBeLessThan(8000) // typically well under 2 s; generous so slow machines don't fail it
  })
})
