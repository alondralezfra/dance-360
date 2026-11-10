import { describe, expect, it } from 'vitest'
import {
  clampView,
  countToX,
  danceLength,
  fitView,
  followPlayhead,
  timelineBounds,
  gridLines,
  gridStep,
  MAX_PX_PER_COUNT,
  MIN_LINE_PX,
  MIN_PX_PER_COUNT,
  nearestMarker,
  panBy,
  snapCountAt,
  visibleRange,
  xToCount,
  zoomAt,
  type TimelineBounds,
  type TimelineView,
} from './timeline'
import type { Formation, Song } from './types'

const f = (id: string, count: number): Formation => ({ id, name: id, count, transitionCounts: 4, positions: {} })
const tempo = { bpm: 120, startOffsetSec: 0, changes: [] }
const song = (durationSec: number): Song => ({ name: 's.mp3', durationSec, size: 1, mime: 'audio/mpeg', hash: 'h' })

const view: TimelineView = { startCount: 8, pxPerCount: 10 }
const bounds: TimelineBounds = { minCount: 0, maxCount: 200 }

describe('count <-> pixel', () => {
  it('maps counts to x relative to the left edge, and back', () => {
    expect(countToX(8, view)).toBe(0)
    expect(countToX(10, view)).toBe(20)
    expect(countToX(0, view)).toBe(-80) // off the left edge
    for (const c of [0, 8, 13.5, 100]) expect(xToCount(countToX(c, view), view)).toBeCloseTo(c)
  })

  it('reports the visible counts', () => {
    expect(visibleRange(view, 300)).toEqual({ start: 8, end: 38 })
  })
})

describe('danceLength', () => {
  it('is at least one set, even for an empty project', () => {
    expect(danceLength([], null, tempo)).toBe(8)
  })

  it('is a set past the last formation when there is no song', () => {
    expect(danceLength([f('a', 0), f('b', 40)], null, tempo)).toBe(48)
  })

  it('is the song length in counts when that is longer', () => {
    // 60s at 120bpm = 120 counts
    expect(danceLength([f('a', 0), f('b', 40)], song(60), tempo)).toBe(120)
  })

  it('rounds the song up to a whole count and respects the start offset', () => {
    expect(danceLength([f('a', 0)], song(10.1), { bpm: 120, startOffsetSec: 0, changes: [] })).toBe(21)
    // the dance starts 2s into the audio, so the song has 2s fewer counts' worth after the start
    expect(danceLength([f('a', 0)], song(10), { bpm: 120, startOffsetSec: 2, changes: [] })).toBe(16)
  })

  it('is not shortened by a song shorter than the formations', () => {
    expect(danceLength([f('a', 0), f('b', 100)], song(5), tempo)).toBe(108)
  })
})

describe('clamping, fitting, panning and zooming', () => {
  it('fits the whole dance in the width', () => {
    const v = fitView(1000, { minCount: 0, maxCount: 200 })
    expect(v).toEqual({ startCount: 0, pxPerCount: 5 })
  })

  it('fit never zooms beyond the limits, and copes with an empty or tiny range', () => {
    expect(fitView(1000, { minCount: 0, maxCount: 1 }).pxPerCount).toBe(MAX_PX_PER_COUNT)
    expect(fitView(10, { minCount: 0, maxCount: 100000 }).pxPerCount).toBe(MIN_PX_PER_COUNT)
    expect(fitView(500, { minCount: 5, maxCount: 5 }).pxPerCount).toBe(MAX_PX_PER_COUNT)
    expect(Number.isFinite(fitView(0, bounds).pxPerCount)).toBe(true)
  })

  it('keeps a view inside its bounds', () => {
    expect(clampView({ startCount: -50, pxPerCount: 10 }, 300, bounds).startCount).toBe(0)
    expect(clampView({ startCount: 500, pxPerCount: 10 }, 300, bounds).startCount).toBe(170) // 200 - 30 visible
  })

  it('left-aligns a view when everything fits', () => {
    expect(clampView({ startCount: 40, pxPerCount: 10 }, 5000, bounds).startCount).toBe(0)
  })

  it('allows a negative start when the bounds do (audio before the dance begins)', () => {
    const b = { minCount: -8, maxCount: 100 }
    expect(clampView({ startCount: -20, pxPerCount: 10 }, 300, b).startCount).toBe(-8)
  })

  it('pans: dragging right brings earlier counts into view, and stops at the ends', () => {
    expect(panBy(view, 50, 300, bounds).startCount).toBe(3) // 50px right = 5 counts earlier
    expect(panBy(view, -50, 300, bounds).startCount).toBe(13)
    expect(panBy(view, 10_000, 300, bounds).startCount).toBe(0)
    expect(panBy(view, -100_000, 300, bounds).startCount).toBe(170)
  })

  it('zooming keeps the count under the pointer where it was', () => {
    const anchorX = 120
    const before = xToCount(anchorX, view)
    for (const factor of [2, 0.5, 1.3]) {
      const zoomed = zoomAt(view, anchorX, factor, 300, { minCount: -1000, maxCount: 1000 })
      expect(xToCount(anchorX, zoomed)).toBeCloseTo(before)
      expect(zoomed.pxPerCount).toBeCloseTo(view.pxPerCount * factor)
    }
  })

  it('zoom is limited at both ends', () => {
    expect(zoomAt(view, 0, 1000, 300, bounds).pxPerCount).toBe(MAX_PX_PER_COUNT)
    expect(zoomAt(view, 0, 0.0001, 300, bounds).pxPerCount).toBe(MIN_PX_PER_COUNT)
  })

  it('zooming out near an edge stays within the bounds', () => {
    const zoomed = zoomAt({ startCount: 0, pxPerCount: 10 }, 0, 0.5, 300, bounds)
    expect(zoomed.startCount).toBeGreaterThanOrEqual(0)
    expect(zoomed.startCount + 300 / zoomed.pxPerCount).toBeLessThanOrEqual(bounds.maxCount + 1e-9)
  })
})

describe('snapping', () => {
  it('snaps a pointer position to the nearest whole count', () => {
    expect(snapCountAt(24, view)).toBe(10) // 8 + 2.4 -> 10
    expect(snapCountAt(26, view)).toBe(11) // 8 + 2.6 -> 11
  })

  it('never snaps before the earliest allowed count', () => {
    expect(snapCountAt(-500, view)).toBe(0)
    expect(snapCountAt(-500, view, -4)).toBe(-4)
  })
})

describe('grid lines', () => {
  const widthPx = 400

  it('draws every count when zoomed in, and marks the start of each set', () => {
    const lines = gridLines({ startCount: 0, pxPerCount: 20 }, widthPx)
    expect(lines.map((l) => l.count).slice(0, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(lines.filter((l) => l.isSetStart).map((l) => l.count)).toEqual([0, 8, 16])
    expect(lines[3].x).toBe(60)
  })

  it('thins to one line per set, then fewer, as you zoom out, never closer than the minimum spacing', () => {
    for (const pxPerCount of [20, 4, 1, 0.3, 0.1]) {
      const lines = gridLines({ startCount: 0, pxPerCount }, 2000)
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i].x - lines[i - 1].x).toBeGreaterThanOrEqual(MIN_LINE_PX - 1e-9)
      }
    }
    expect(gridStep(20)).toBe(1)
    expect(gridStep(4)).toBe(8)
    expect(gridStep(1)).toBe(8)
    expect(gridStep(0.5)).toBe(32)
    expect(gridStep(0.1)).toBe(128)
  })

  it('when thinned to sets, every line is a set start', () => {
    const lines = gridLines({ startCount: 0, pxPerCount: 2 }, widthPx)
    expect(lines.every((l) => l.isSetStart)).toBe(true)
    expect(lines.map((l) => l.count)).toEqual([0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128, 136, 144, 152, 160, 168, 176, 184, 192, 200])
  })

  it('starts at the first line inside a scrolled view and covers the right edge', () => {
    const lines = gridLines({ startCount: 10.5, pxPerCount: 20 }, widthPx)
    expect(lines[0].count).toBe(11)
    expect(lines[0].x).toBeCloseTo(10)
    expect(lines.at(-1)!.x).toBeLessThanOrEqual(widthPx)
    expect(lines.at(-1)!.x).toBeGreaterThan(widthPx - 20)
  })

  it('handles negative counts (before the dance starts) with sets still on multiples of 8', () => {
    const lines = gridLines({ startCount: -9, pxPerCount: 20 }, 300)
    expect(lines[0].count).toBe(-9)
    expect(lines.filter((l) => l.isSetStart).map((l) => l.count)).toEqual([-8, 0])
  })

  it('draws nothing for a zero-width view, and a bounded number of lines for a huge one', () => {
    expect(gridLines(view, 0).length).toBeLessThanOrEqual(1)
    expect(gridLines({ startCount: 0, pxPerCount: MIN_PX_PER_COUNT }, 5000).length).toBeLessThan(500)
  })
})

describe('nearestMarker', () => {
  const list = [f('a', 8), f('b', 10), f('c', 40)]
  const v: TimelineView = { startCount: 0, pxPerCount: 10 } // a at x=80, b at x=100, c at x=400

  it('finds the marker under the pointer', () => {
    expect(nearestMarker(list, 100, v, 8)).toBe('b')
    expect(nearestMarker(list, 404, v, 8)).toBe('c')
  })

  it('picks the nearest of two close markers', () => {
    expect(nearestMarker(list, 85, v, 20)).toBe('a')
    expect(nearestMarker(list, 96, v, 20)).toBe('b')
  })

  it('prefers the earlier formation on an exact tie', () => {
    expect(nearestMarker(list, 90, v, 20)).toBe('a')
  })

  it('is null when nothing is within the tolerance, or there are no formations', () => {
    expect(nearestMarker(list, 250, v, 20)).toBeNull()
    expect(nearestMarker([], 100, v, 20)).toBeNull()
    expect(nearestMarker(list, 85, v, 4)).toBeNull()
  })

  it('a larger tolerance (a finger) finds what a smaller one (a mouse) misses', () => {
    expect(nearestMarker(list, 70, v, 6)).toBeNull()
    expect(nearestMarker(list, 70, v, 14)).toBe('a')
  })
})

describe('followPlayhead', () => {
  const zoomed: TimelineView = { startCount: 40, pxPerCount: 10 } // 300px shows counts 40 to 70

  it('leaves the view alone while the playhead is comfortably on screen', () => {
    for (const count of [40, 55, 66]) expect(followPlayhead(zoomed, count, 300, bounds)).toBe(zoomed)
  })

  it('turns the page when the playhead runs off the right edge, putting it near the left', () => {
    const next = followPlayhead(zoomed, 72, 300, bounds)
    expect(next.pxPerCount).toBe(10)
    expect(next.startCount).toBeCloseTo(72 - 3) // 10% of the 30 visible counts in from the left
  })

  it('turns the page back when the playhead is left of the view (a jump backwards)', () => {
    const next = followPlayhead(zoomed, 12, 300, bounds)
    expect(next.startCount).toBeCloseTo(9)
  })

  it('turns the page a little before the very edge, so the playhead is never hidden under it', () => {
    expect(followPlayhead(zoomed, 69.9, 300, bounds)).not.toBe(zoomed)
  })

  it('never scrolls past the ends of the dance', () => {
    expect(followPlayhead({ startCount: 100, pxPerCount: 10 }, 2, 300, bounds).startCount).toBe(0)
    expect(followPlayhead(zoomed, 199, 300, bounds).startCount).toBe(170) // 200 - 30 visible
  })

  it('does nothing when everything is already on screen', () => {
    const all = fitView(300, bounds)
    expect(followPlayhead(all, 120, 300, bounds)).toBe(all)
  })
})

describe('timelineBounds', () => {
  it('runs from count 0 to the end of the dance when the song starts at its beginning', () => {
    expect(timelineBounds([f('a', 0), f('b', 40)], null, tempo)).toEqual({ minCount: 0, maxCount: 48 })
  })

  it('starts earlier than count 0 by the intro, when the dance starts part-way into the song', () => {
    const later = { bpm: 120, startOffsetSec: 4, changes: [] } // 8 counts of song before count 0
    expect(timelineBounds([f('a', 0)], song(60), later).minCount).toBe(-8)
  })

  it('ends with the song when that is longer than the formations', () => {
    expect(timelineBounds([f('a', 0), f('b', 8)], song(60), tempo).maxCount).toBe(120)
  })

  it('never starts later than count 0', () => {
    expect(timelineBounds([f('a', 0)], null, { bpm: 120, startOffsetSec: 0, changes: [] }).minCount).toBe(0)
  })
})
