// Estimating a song's tempo and where its first beat lands, from decoded audio.
// Pure maths on numbers (decoding the file is the browser's job, src/audio/), so it
// is tested against made-up beat tracks with a known answer. See decisions/0018.
//
// How it works, in three steps:
//   1. onsetStrength: turn the audio into a curve, 100 values a second, that jumps
//      whenever something new starts (a kick, a snare): the change in the spectrum,
//      looked at in low, middle and high frequencies separately so that a busy hi-hat
//      cannot drown out the kick that actually sets the beat.
//   2. A coarse search: how well does the curve repeat after one beat, two, three,
//      four? Pick the tempo it repeats at best, leaning a little towards the speeds
//      dance music usually has (this settles "64 or 128?" most of the time).
//   3. A fine search around that tempo, in 0.05 BPM steps and every position of the
//      beat grid, for the grid whose beats land on the strongest onsets. That gives
//      the tempo to a fraction of a BPM (which matters: 0.2 BPM drifts nearly a beat
//      over four minutes) and where the first beat is.
// It reports how sure it is. Music with no steady beat gives a low confidence, and
// callers should then say "couldn't tell" rather than guess.

import { fft } from './fft'

export interface TempoEstimate {
  bpm: number
  /** When the first strong beat lands, in seconds from the start of the audio. */
  firstBeatSec: number
  /** 0 (no beat found) to 1 (a very clear beat). */
  confidence: number
}

/** The tempos considered. Slower or faster music is reported at half or double. */
export const MIN_BPM = 60
export const MAX_BPM = 200
/** Below this confidence the beat is too unclear to report. (Clear beats score 0.9 and up; noise and held tones stay under 0.3.) */
export const MIN_CONFIDENCE = 0.45
/** Shorter audio doesn't repeat often enough to tell. */
const MIN_SECONDS = 8
/** The curve is sampled this many times a second. */
const CURVE_RATE = 100
/** How strongly the coarse search leans towards `PRIOR_CENTER_BPM`, as a spread in octaves. */
const PRIOR_CENTER_BPM = 120
const PRIOR_SPREAD_OCTAVES = 0.7
/** A band whose average onset strength is below this has no onsets worth looking at. */
const MIN_BAND_ONSETS = 0.02
/**
 * Beats found by the onset curve are stamped this much earlier than the sound really starts
 * (measured on made-up beat tracks, where it is a steady 12 to 13 ms). Added back so the first
 * beat is reported where it is heard. Far smaller than a count, but free to get right.
 */
const ONSET_DELAY_SEC = 0.0125
/** The refinement looks this many BPM either side of the coarse answer. */
const REFINE_RANGE_BPM = 3
/**
 * The three frequency bands (in Hz) the onset curve looks at, and how much each counts.
 * The low band (kick, bass) counts most because it carries the beat in most dance music.
 */
const BANDS = [
  { from: 30, to: 250, weight: 1 },
  { from: 250, to: 2000, weight: 0.6 },
  { from: 2000, to: 4000, weight: 0.3 },
] as const

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

export interface OnsetCurve {
  /** How strongly something new starts at each moment (never negative). */
  envelope: Float32Array
  /** Values per second. */
  rate: number
  /** The time, in seconds, that the first value stands for. */
  offsetSec: number
}

/**
 * The onset curve of some audio: for each 10 ms step, how much louder the spectrum
 * got than a moment ago, summed across frequencies (on a log scale so quiet detail
 * counts), minus its recent average so steady sounds drop out.
 */
export function onsetStrength(samples: Float32Array, sampleRate: number): OnsetCurve {
  const hop = Math.max(1, Math.round(sampleRate / CURVE_RATE))
  const rate = sampleRate / hop
  let size = 1
  while (size < sampleRate * 0.032) size <<= 1
  if (!(sampleRate > 0) || samples.length < size) {
    return { envelope: new Float32Array(0), rate: rate || CURVE_RATE, offsetSec: 0 }
  }

  const frames = Math.floor((samples.length - size) / hop) + 1
  const window = Float64Array.from({ length: size }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)))
  const re = new Float64Array(size)
  const im = new Float64Array(size)
  let previous = new Float64Array(size / 2)
  let current = new Float64Array(size / 2)
  // The bins each band covers (a bin is sampleRate / size Hz wide).
  const binHz = sampleRate / size
  const bins = BANDS.map((band) => ({
    from: Math.max(1, Math.round(band.from / binHz)),
    to: Math.min(size / 2, Math.max(2, Math.round(band.to / binHz))),
  }))
  const flux = BANDS.map(() => new Float64Array(frames))

  for (let f = 0; f < frames; f++) {
    const start = f * hop
    for (let i = 0; i < size; i++) {
      re[i] = samples[start + i] * window[i]
      im[i] = 0
    }
    fft(re, im)
    for (let b = 1; b < size / 2; b++) current[b] = Math.log1p(10 * Math.hypot(re[b], im[b]))
    if (f > 0) {
      bins.forEach(({ from, to }, k) => {
        let sum = 0
        for (let b = from; b < to; b++) sum += Math.max(0, current[b] - previous[b])
        flux[k][f] = sum
      })
    }
    ;[previous, current] = [current, previous]
  }

  // Per band: subtract a half-second moving average, so a steady rise or a constant buzz is not an
  // "onset", then scale so every band averages 1 (a quiet band still gets its say), and add them up.
  const span = Math.max(1, Math.round(rate * 0.25))
  const envelope = new Float32Array(frames)
  flux.forEach((band, k) => {
    const prefix = new Float64Array(frames + 1)
    for (let f = 0; f < frames; f++) prefix[f + 1] = prefix[f] + band[f]
    const onsets = new Float64Array(frames)
    let total = 0
    for (let f = 0; f < frames; f++) {
      const lo = Math.max(0, f - span)
      const hi = Math.min(frames, f + span + 1)
      onsets[f] = Math.max(0, band[f] - (prefix[hi] - prefix[lo]) / (hi - lo))
      total += onsets[f]
    }
    // A band where almost nothing starts (a held note, silence) stays silent instead of being scaled up.
    const scale = total / frames > MIN_BAND_ONSETS ? (BANDS[k].weight * frames) / total : 0
    for (let f = 0; f < frames; f++) envelope[f] += onsets[f] * scale
  })

  // A burst is seen a little before the middle of the window that first covers it.
  return { envelope, rate, offsetSec: size / 4 / sampleRate + ONSET_DELAY_SEC }
}

/** Autocorrelation of a curve at lags 0..maxLag, scaled so lag 0 is 1. */
function autocorrelation(values: Float64Array, maxLag: number): Float64Array {
  const n = values.length
  const ac = new Float64Array(maxLag + 1)
  for (let lag = 0; lag <= maxLag && lag < n; lag++) {
    let sum = 0
    for (let i = 0; i + lag < n; i++) sum += values[i] * values[i + lag]
    ac[lag] = sum / (n - lag)
  }
  const zero = ac[0]
  if (zero > 0) for (let lag = 0; lag <= maxLag; lag++) ac[lag] /= zero
  return ac
}

/** A value read between two neighbouring entries. */
function between(values: ArrayLike<number>, position: number): number {
  const i = Math.floor(position)
  if (i < 0 || i + 1 >= values.length) return 0
  const frac = position - i
  return values[i] * (1 - frac) + values[i + 1] * frac
}

/**
 * The tempo and first beat of a song, from its onset curve; or null if the audio
 * is too short or has no beat to speak of. The returned confidence can still be low
 * (see `MIN_CONFIDENCE`) for music with a weak or wandering beat.
 */
export function estimateTempo(curve: OnsetCurve): TempoEstimate | null {
  const { envelope, rate, offsetSec } = curve
  const n = envelope.length
  if (n < MIN_SECONDS * rate) return null

  let mean = 0
  for (const v of envelope) mean += v
  mean /= n
  if (!(mean > 1e-9)) return null // silence, or a steady sound: nothing starts anywhere

  // --- 2. coarse search ---
  // Blur each spike over its neighbours first: at fast tempos a beat is a fraction of a step long, so
  // sharp spikes land alternately on and between steps and the repeat would look weaker than it is.
  const centered = Float64Array.from(envelope, (v, i) => {
    const left = envelope[Math.max(0, i - 1)]
    const right = envelope[Math.min(n - 1, i + 1)]
    return 0.25 * left + 0.5 * v + 0.25 * right - mean
  })
  const maxLag = Math.ceil(((rate * 60) / MIN_BPM) * 4) + 2
  const ac = autocorrelation(centered, maxLag)
  const weights = [1, 0.5, 0.33, 0.25]
  let coarse = { bpm: PRIOR_CENTER_BPM, score: -Infinity }
  for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm += 0.25) {
    const period = (rate * 60) / bpm
    let score = 0
    weights.forEach((w, h) => (score += w * between(ac, period * (h + 1))))
    score *= Math.exp(-0.5 * (Math.log2(bpm / PRIOR_CENTER_BPM) / PRIOR_SPREAD_OCTAVES) ** 2)
    if (score > coarse.score) coarse = { bpm, score }
  }

  // --- 3. fine search over tempo and where the beat grid sits ---
  let best = { bpm: coarse.bpm, phase: 0, strength: -Infinity, profile: [] as number[] }
  const lowest = Math.max(MIN_BPM / 2, coarse.bpm - REFINE_RANGE_BPM)
  for (let bpm = lowest; bpm <= coarse.bpm + REFINE_RANGE_BPM; bpm += 0.05) {
    const period = (rate * 60) / bpm
    const profile: number[] = []
    let bestPhase = { phase: 0, strength: -Infinity }
    for (let phase = 0; phase < period; phase += 0.5) {
      let sum = 0
      let beats = 0
      for (let at = phase; at < n - 1; at += period) {
        sum += between(envelope, at)
        beats++
      }
      const strength = sum / beats
      profile.push(strength)
      if (strength > bestPhase.strength) bestPhase = { phase, strength }
    }
    if (bestPhase.strength > best.strength) best = { bpm, ...bestPhase, profile }
  }

  // How much stronger the onsets are on the best beat grid than on the typical grid position at that
  // tempo. A real beat stands far above the rest; noise has no favourite position.
  const typicalGrid = [...best.profile].sort((a, b) => a - b)[Math.floor(best.profile.length / 2)]
  const standsOut = best.strength > 0 ? clamp((best.strength - typicalGrid) / best.strength, 0, 1) : 0

  // The strength of each beat on the best grid (a beat may be a frame early or late).
  const period = (rate * 60) / best.bpm
  const strengths: number[] = []
  for (let at = best.phase; at < n - 1; at += period) {
    strengths.push(Math.max(...[-1, 0, 1].map((d) => envelope[clamp(Math.round(at) + d, 0, n - 1)])))
  }
  // A real beat is there beat after beat. One loud moment (a sound that starts and then holds)
  // can look like a perfect beat grid, so require most beats to have a sound on them.
  const present = strengths.filter((s) => s >= 0.3 * best.strength).length / strengths.length
  const confidence = standsOut * clamp(present / 0.5, 0, 1)

  // The first beat that really has a sound on it (a song may start with a quiet intro).
  const ranked = [...strengths].sort((a, b) => b - a)
  const typical = ranked[Math.floor(ranked.length / 4)] ?? 0
  const first = Math.max(0, strengths.findIndex((s) => s >= 0.4 * typical))

  return {
    bpm: best.bpm,
    firstBeatSec: offsetSec + (best.phase + first * period) / rate,
    confidence,
  }
}

/** Convenience: estimate straight from decoded audio (channels are averaged into one). */
export function estimateTempoFromSamples(channels: Float32Array[], sampleRate: number): TempoEstimate | null {
  const length = channels.reduce((max, c) => Math.max(max, c.length), 0)
  if (length === 0) return null
  const mono = new Float32Array(length)
  for (const channel of channels) for (let i = 0; i < channel.length; i++) mono[i] += channel[i] / channels.length
  return estimateTempo(onsetStrength(mono, sampleRate))
}
