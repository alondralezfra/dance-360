// The maths of the timeline panel: which counts are visible, where they are on
// screen, how zoom and scroll work, which grid lines to draw, and which formation
// marker a pointer is on. Pure and independent of any canvas or React, like
// playback.ts, so it is exhaustively testable and the panel only draws its results.
//
// The timeline always speaks in counts (decisions/0002). Seconds only appear in
// `danceLength`, through tempo.ts.

import { COUNTS_PER_SET, secondsToCount } from './tempo'
import type { Formation, Id, Song, TempoMap } from './types'

/** What part of the dance is on screen: the count at the left edge and how wide one count is. */
export interface TimelineView {
  startCount: number
  pxPerCount: number
}

/** The counts the view may show: scrolling can't go past either end. */
export interface TimelineBounds {
  minCount: number
  maxCount: number
}

/** Zoom limits (pixels per count): a whole long song fits on a phone, and single counts stay tappable. */
export const MIN_PX_PER_COUNT = 0.1
export const MAX_PX_PER_COUNT = 64
/** Grid lines are never drawn closer together than this many pixels. */
export const MIN_LINE_PX = 8
/** How many counts between grid lines, from finest to coarsest. */
const GRID_STEPS = [1, COUNTS_PER_SET, COUNTS_PER_SET * 4, COUNTS_PER_SET * 16, COUNTS_PER_SET * 64] as const

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
const clampZoom = (px: number) => clamp(px, MIN_PX_PER_COUNT, MAX_PX_PER_COUNT)

export const countToX = (count: number, view: TimelineView) => (count - view.startCount) * view.pxPerCount
export const xToCount = (x: number, view: TimelineView) => view.startCount + x / view.pxPerCount

/** The counts between the left and right edges of a view `widthPx` wide. */
export function visibleRange(view: TimelineView, widthPx: number): { start: number; end: number } {
  return { start: view.startCount, end: xToCount(widthPx, view) }
}

/**
 * How long the dance is, in counts: until the end of the song, or a set past the
 * last formation, whichever is later (and at least one set, so an empty project
 * still has a timeline to show).
 */
export function danceLength(formations: Formation[], song: Song | null, tempo: TempoMap): number {
  const lastFormation = formations.length > 0 ? formations[formations.length - 1].count : 0
  const songCounts = song ? Math.ceil(secondsToCount(song.durationSec, tempo)) : 0
  return Math.max(COUNTS_PER_SET, lastFormation + COUNTS_PER_SET, songCounts)
}

/**
 * The counts the timeline can show: from where the song begins (before count 0 when the
 * dance starts part-way in, so the intro is visible) to the end of the dance.
 */
export function timelineBounds(formations: Formation[], song: Song | null, tempo: TempoMap): TimelineBounds {
  return {
    minCount: Math.min(0, Math.floor(secondsToCount(0, tempo))),
    maxCount: danceLength(formations, song, tempo),
  }
}

/** Keep a view inside its bounds. If everything fits, it is left-aligned. */
export function clampView(view: TimelineView, widthPx: number, bounds: TimelineBounds): TimelineView {
  const pxPerCount = clampZoom(view.pxPerCount)
  const visibleCounts = widthPx / pxPerCount
  const lastStart = Math.max(bounds.minCount, bounds.maxCount - visibleCounts)
  return { pxPerCount, startCount: clamp(view.startCount, bounds.minCount, lastStart) }
}

/** The view that shows the whole dance. */
export function fitView(widthPx: number, bounds: TimelineBounds): TimelineView {
  const span = Math.max(bounds.maxCount - bounds.minCount, 1)
  return { startCount: bounds.minCount, pxPerCount: clampZoom(widthPx / span) }
}

/**
 * Zoom by `factor` (above 1 zooms in) keeping the count under `anchorX` where it
 * is on screen, as pinch and mouse-wheel zoom should.
 */
export function zoomAt(
  view: TimelineView,
  anchorX: number,
  factor: number,
  widthPx: number,
  bounds: TimelineBounds,
): TimelineView {
  const pxPerCount = clampZoom(view.pxPerCount * factor)
  const anchored = xToCount(anchorX, view)
  return clampView({ pxPerCount, startCount: anchored - anchorX / pxPerCount }, widthPx, bounds)
}

/** Scroll by `dxPx` pixels: dragging right moves the content right, so earlier counts come into view. */
export function panBy(view: TimelineView, dxPx: number, widthPx: number, bounds: TimelineBounds): TimelineView {
  return clampView({ ...view, startCount: view.startCount - dxPx / view.pxPerCount }, widthPx, bounds)
}

/**
 * Keeps the playhead on screen while the song plays: if it has run off the right edge
 * (or jumped to before the left one), turn the page so it sits a little in from the left.
 * Returns the same view, unchanged, while the playhead is comfortably visible.
 */
export function followPlayhead(view: TimelineView, count: number, widthPx: number, bounds: TimelineBounds): TimelineView {
  const visible = widthPx / view.pxPerCount
  if (count >= view.startCount && count <= view.startCount + visible * 0.95) return view
  return clampView({ ...view, startCount: count - visible * 0.1 }, widthPx, bounds)
}

/** The count where a pointer at `x` lands when snapping to whole counts, never before `minCount`. */
export function snapCountAt(x: number, view: TimelineView, minCount = 0): number {
  return Math.max(minCount, Math.round(xToCount(x, view)))
}

/** How many counts apart grid lines are at this zoom: every count when zoomed in, then every set, and so on. */
export function gridStep(pxPerCount: number): number {
  return GRID_STEPS.find((step) => step * pxPerCount >= MIN_LINE_PX) ?? GRID_STEPS[GRID_STEPS.length - 1]
}

export interface GridLine {
  count: number
  /** Where it is drawn, in pixels from the left edge. */
  x: number
  /** The start of a set (count 1 of 8), which is drawn heavier and labelled. */
  isSetStart: boolean
}

/** The grid lines to draw for a view `widthPx` wide, thinned out as you zoom out so they never crowd. */
export function gridLines(view: TimelineView, widthPx: number): GridLine[] {
  const step = gridStep(view.pxPerCount)
  const { start, end } = visibleRange(view, widthPx)
  const lines: GridLine[] = []
  for (let count = Math.ceil(start / step) * step; count <= end; count += step) {
    lines.push({ count, x: countToX(count, view), isSetStart: count % COUNTS_PER_SET === 0 })
  }
  return lines
}

/**
 * The formation whose marker is nearest a pointer at `x`, if within `tolerancePx`
 * (a finger needs more than a mouse). The earlier formation wins a tie.
 */
export function nearestMarker(
  formations: Formation[],
  x: number,
  view: TimelineView,
  tolerancePx: number,
): Id | null {
  let best: { id: Id; distance: number } | null = null
  for (const f of formations) {
    const distance = Math.abs(countToX(f.count, view) - x)
    if (distance <= tolerancePx && (best === null || distance < best.distance)) best = { id: f.id, distance }
  }
  return best?.id ?? null
}
