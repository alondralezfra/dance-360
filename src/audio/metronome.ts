// The metronome: a short tick on every count, a higher one on the first count of each set.
// Clicks are scheduled a moment ahead on the audio engine's own clock, which is far more
// exact than a timer, then topped up every few milliseconds. What clicks fall where, and
// where the song is, come from the caller; this only makes the sound (decisions/0013).

import type { Click } from '../model/metronome'

/** What the metronome needs to know. */
export interface ClickSource {
  /** Where the song is right now, in seconds. */
  time(): number
  /** The clicks from one moment up to (not including) another. */
  clicks(fromSec: number, toSec: number): Click[]
}

export interface Metronome {
  /** Begins clicking along with `source`. Starting again (after a jump in the song) restarts cleanly. */
  start(source: ClickSource): void
  stop(): void
  /** Stops and releases the audio engine. */
  dispose(): void
}

/** The parts of the browser's audio engine used here, so tests can stand in for it. */
export interface AudioContextLike {
  readonly currentTime: number
  readonly destination: unknown
  resume(): Promise<void>
  close(): Promise<void>
  createOscillator(): {
    type: string
    frequency: { value: number }
    connect(node: unknown): unknown
    start(when: number): void
    stop(when: number): void
  }
  createGain(): {
    gain: { setValueAtTime(value: number, when: number): unknown; exponentialRampToValueAtTime(value: number, when: number): unknown }
    connect(node: unknown): unknown
  }
}

/** How far ahead clicks are scheduled, and how often the schedule is topped up. */
const LOOKAHEAD_SEC = 0.15
const TICK_MS = 25
/** A click this far in the past (after the page stalled) is skipped rather than sounded late. */
const STALE_SEC = 0.03
const NORMAL_HZ = 1000
const ACCENT_HZ = 1600

export function createMetronome(makeContext: () => AudioContextLike = () => new AudioContext() as unknown as AudioContextLike): Metronome {
  let context: AudioContextLike | null = null
  let timer: ReturnType<typeof setInterval> | null = null

  const sound = (ctx: AudioContextLike, when: number, accent: boolean) => {
    const oscillator = ctx.createOscillator()
    const envelope = ctx.createGain()
    oscillator.type = 'square'
    oscillator.frequency.value = accent ? ACCENT_HZ : NORMAL_HZ
    // A very short, sharp tick: up in 2 ms, gone by 50 ms.
    envelope.gain.setValueAtTime(0.0001, when)
    envelope.gain.exponentialRampToValueAtTime(0.35, when + 0.002)
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + 0.05)
    oscillator.connect(envelope)
    envelope.connect(ctx.destination)
    oscillator.start(when)
    oscillator.stop(when + 0.06)
  }

  const stop = () => {
    if (timer !== null) clearInterval(timer)
    timer = null
  }

  return {
    start(source) {
      stop()
      try {
        context ??= makeContext()
      } catch {
        return // no audio engine here: the song still plays, just without clicks
      }
      const ctx = context
      void ctx.resume().catch(() => {})
      let scheduledTo = source.time()
      timer = setInterval(() => {
        const now = source.time()
        const horizon = now + LOOKAHEAD_SEC
        const from = Math.max(scheduledTo, now - STALE_SEC)
        if (horizon <= from) return
        for (const click of source.clicks(from, horizon)) {
          sound(ctx, ctx.currentTime + Math.max(0, click.sec - now), click.accent)
        }
        scheduledTo = horizon
      }, TICK_MS)
    },

    stop,

    dispose() {
      stop()
      void context?.close().catch(() => {})
      context = null
    },
  }
}
