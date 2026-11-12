// Made-up music for tests: a beat track with a known tempo and first beat, so the
// tempo estimator can be checked against the right answer. Plain numbers, no
// browser, so unit tests and the browser tests (which turn it into a real WAV file)
// share it. Deterministic: the same options always give the same samples.

import { encodeWav } from '../model/wav'

export interface BeatTrackOptions {
  bpm: number
  seconds: number
  /** When the first beat lands, in seconds. Default 0. */
  firstBeatSec?: number
  sampleRate?: number
  /** Soft hi-hats between the beats, as in most dance music. Default true. */
  hats?: boolean
  /** Snare on every second beat. Default true. */
  snare?: boolean
  /** Each beat lands up to this many seconds early or late, like a live player. Default 0. */
  jitterSec?: number
  /** Level of background noise, 0 to 1. Default 0. */
  noise?: number
  /** Silence at the start before any beats (a quiet intro), in seconds. Beats still land on the same grid. Default 0. */
  silentIntroSec?: number
}

/** A small deterministic noise source (the same sequence every time). */
function randoms(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0xffffffff
  }
}

/** A kick (low thump), a snare on every second beat, and quiet hats between the beats. */
export function beatTrack(options: BeatTrackOptions): Float32Array {
  const { bpm, seconds, firstBeatSec = 0, sampleRate = 8000, hats = true, snare = true, jitterSec = 0, noise = 0 } = options
  const silentIntroSec = options.silentIntroSec ?? 0
  const out = new Float32Array(Math.floor(seconds * sampleRate))
  const random = randoms(12345)
  const beatSec = 60 / bpm

  const add = (startSec: number, length: number, shape: (t: number, i: number) => number, gain: number) => {
    const first = Math.round(startSec * sampleRate)
    for (let i = 0; i < Math.floor(length * sampleRate); i++) {
      const at = first + i
      if (at >= 0 && at < out.length) out[at] += gain * shape(i / sampleRate, i)
    }
  }
  const kick = (t: number) => Math.sin(2 * Math.PI * (55 + 120 * Math.exp(-t * 40)) * t) * Math.exp(-t * 22)
  const snareHit = (t: number) => (random() * 2 - 1) * Math.exp(-t * 28)
  const hat = (t: number) => (random() * 2 - 1) * Math.exp(-t * 120)

  for (let k = 0; ; k++) {
    const nominal = firstBeatSec + k * beatSec
    if (nominal > seconds) break
    if (nominal < silentIntroSec) continue
    const at = nominal + (random() * 2 - 1) * jitterSec
    add(at, 0.18, kick, 0.9)
    if (snare && k % 2 === 1) add(at, 0.12, snareHit, 0.5)
    if (hats) add(at + beatSec / 2, 0.04, hat, 0.25)
  }
  if (noise > 0) for (let i = 0; i < out.length; i++) out[i] += (random() * 2 - 1) * noise
  // keep it in range
  for (let i = 0; i < out.length; i++) out[i] = Math.max(-1, Math.min(1, out[i]))
  return out
}

/** White noise: no beat at all. */
export function whiteNoise(seconds: number, sampleRate = 8000, level = 0.3): Float32Array {
  const random = randoms(777)
  return Float32Array.from({ length: Math.floor(seconds * sampleRate) }, () => (random() * 2 - 1) * level)
}

/** A steady tone: loud and constant, with no beat in it. */
export function steadyTone(seconds: number, sampleRate = 8000, frequency = 220): Float32Array {
  return Float32Array.from({ length: Math.floor(seconds * sampleRate) }, (_, i) =>
    0.5 * Math.sin((2 * Math.PI * frequency * i) / sampleRate),
  )
}

/** Wrap samples as a mono 16-bit WAV file, for tests that need real audio bytes. */
export const wavBytes = (samples: Float32Array, sampleRate = 8000): Uint8Array => encodeWav(samples, sampleRate)
