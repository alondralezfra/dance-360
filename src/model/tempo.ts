import type { TempoMap } from './types'

export const COUNTS_PER_SET = 8
export const DEFAULT_TRANSITION_COUNTS = 4

export const DEFAULT_TEMPO: TempoMap = { bpm: 120, startOffsetSec: 0 }

/** Audio time (seconds) at which an absolute count lands. Counts may be fractional. */
export function countToSeconds(count: number, tempo: TempoMap): number {
  return tempo.startOffsetSec + (count * 60) / tempo.bpm
}

/** The absolute count playing at an audio time. Negative before the dance starts. */
export function secondsToCount(seconds: number, tempo: TempoMap): number {
  return ((seconds - tempo.startOffsetSec) * tempo.bpm) / 60
}

/** Round to the nearest whole count (used by tap-to-snap and grid placement). */
export function snapToCount(count: number): number {
  return Math.round(count)
}

/** Absolute count -> 1-based set and count within the set. */
export function toSetAndCount(count: number): { set: number; count: number } {
  const whole = Math.floor(count)
  return {
    set: Math.floor(whole / COUNTS_PER_SET) + 1,
    count: (((whole % COUNTS_PER_SET) + COUNTS_PER_SET) % COUNTS_PER_SET) + 1,
  }
}

/** "Set 3 · Count 5" */
export function formatCount(count: number): string {
  const sc = toSetAndCount(count)
  return `Set ${sc.set} · Count ${sc.count}`
}
