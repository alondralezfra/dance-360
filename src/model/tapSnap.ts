// Tap-to-snap placement (plan §3.2): play the song and tap once per formation;
// each tap lands that formation on the nearest whole count, so imprecise tapping
// doesn't matter. Pure: the screen supplies the tap time and the latency, this
// decides the count and the new formation list.

import { formationIndexAt } from './formations'
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
 * The formation a take of taps starts with: the one that has not landed yet at `count` (the
 * song position of the first tap, before snapping). Before the dance's first formation has
 * landed that is the first formation (the tap says where the dance starts); after that it is
 * the one after the formation the song is in. -1 when there is nothing left to place (the
 * song is in the last formation), or no formations at all. `formations` must be sorted by count.
 */
export function firstToPlace(formations: Formation[], count: number): number {
  if (formations.length === 0) return -1
  if (count < formations[0].count) return 0
  const next = formationIndexAt(formations, count) + 1
  return next < formations.length ? next : -1
}

/**
 * Put one formation on `count`, as a tap does. The formation stays where it is in
 * the running order: it can't land on or before the formation before it, and
 * later ones are pushed on just enough to stay in order, even when it is placed past them.
 * An unknown id returns the list unchanged.
 */
export function placeFormationAt(formations: Formation[], id: Id, count: number): Formation[] {
  const index = formations.findIndex((f) => f.id === id)
  if (index === -1) return formations
  const earliest = index === 0 ? 0 : formations[index - 1].count + 1
  const landing = Math.max(Math.round(count), earliest)
  if (formations[index].count === landing) return formations
  // Not sorted (a formation placed past the next one would swap places with it): the later ones are pushed on instead.
  let last = landing
  return formations.map((f, i) => {
    if (i < index) return f
    if (i === index) return { ...f, count: landing }
    const count = Math.max(f.count, last + 1)
    last = count
    return count === f.count ? f : { ...f, count }
  })
}
