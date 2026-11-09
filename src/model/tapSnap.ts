// Tap-to-snap placement (plan §3.2): play the song and tap once per formation;
// each tap lands that formation on the nearest whole count, so imprecise tapping
// doesn't matter. Pure: the screen supplies the tap time and the latency, this
// decides the count and the new formation list.

import { normalizeCounts } from './formations'
import { secondsToCount, snapToCount } from './tempo'
import type { Formation, Id, TempoMap } from './types'

/**
 * The whole count a tap at `tapSec` (audio time) means. `latencySec` is how much
 * later than the music the tap is heard and felt: the speaker's delay (large on
 * Bluetooth) plus the person's reaction time. It is taken off before snapping.
 * Never negative: a tap before the dance starts means count 0.
 */
export function tapToCount(tapSec: number, tempo: TempoMap, latencySec = 0): number {
  return Math.max(0, snapToCount(secondsToCount(tapSec - latencySec, tempo)))
}

/**
 * Put one formation on `count`, as a tap does. The formation stays where it is in
 * the running order: it can't land on or before the formation before it, and
 * later ones are pushed on just enough to stay in order (as `normalizeCounts` does
 * for any retiming). An unknown id returns the list unchanged.
 */
export function placeFormationAt(formations: Formation[], id: Id, count: number): Formation[] {
  const index = formations.findIndex((f) => f.id === id)
  if (index === -1) return formations
  const earliest = index === 0 ? 0 : formations[index - 1].count + 1
  const landing = Math.max(Math.round(count), earliest)
  if (formations[index].count === landing) return formations
  return normalizeCounts(formations.map((f, i) => (i === index ? { ...f, count: landing } : f)))
}
