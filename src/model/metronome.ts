// Which metronome clicks fall in a stretch of the song. Pure: the scheduler in
// src/audio/ asks "what clicks are coming in the next moments?" and plays them.
// One click per whole count from count 0 on, the first count of each set louder.

import { COUNTS_PER_SET, countToSeconds, secondsToCount } from './tempo'
import type { TempoMap } from './types'

export interface Click {
  count: number
  /** When it sounds, in seconds from the start of the song. */
  sec: number
  /** The first count of a set. */
  accent: boolean
}

/** A safety limit: a stretch is never asked for more clicks than this, whatever the tempo. */
const MAX_CLICKS = 2000

/**
 * The clicks from `fromSec` up to but not including `toSec`, in order. A click
 * exactly at `fromSec` is included, so asking for consecutive stretches never
 * skips or repeats one. There are no clicks before count 0 (the dance hasn't started).
 */
export function clicksBetween(tempo: TempoMap, fromSec: number, toSec: number): Click[] {
  if (!(toSec > fromSec) || !(tempo.bpm > 0)) return []
  const clicks: Click[] = []
  // (a tiny allowance so a click that lands exactly on fromSec isn't lost to rounding)
  for (let count = Math.max(0, Math.ceil(secondsToCount(fromSec, tempo) - 1e-9)); clicks.length < MAX_CLICKS; count++) {
    const sec = countToSeconds(count, tempo)
    if (sec >= toSec) break
    clicks.push({ count, sec, accent: count % COUNTS_PER_SET === 0 })
  }
  return clicks
}
