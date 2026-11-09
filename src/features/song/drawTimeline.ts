import { crispLine, strokeFor } from '../../lib/devicePixels'
import { levelBetween, type Peaks } from '../../model/peaks'
import { COUNTS_PER_SET, countToSeconds, toSetAndCount } from '../../model/tempo'
import { countToX, gridLines, gridStep, xToCount, type TimelineView } from '../../model/timeline'
import type { Formation, TempoMap } from '../../model/types'
import type { CanvasTheme } from '../../theme/useCanvasTheme'

/** Height of the strip along the top that holds the set and count numbers (CSS px). */
export const RULER_HEIGHT = 34
/** A set label needs about this much room; when sets are closer than that, only some sets are labelled. */
const SET_LABEL_ROOM = 52
/** Count numbers need about this much room per count. */
const COUNT_LABEL_ROOM = 24
const MARKER_LABEL_RADIUS = 9

export interface TimelineDrawing {
  /** Size of the drawing area in CSS pixels. */
  width: number
  height: number
  dpr: number
  view: TimelineView
  tempo: TempoMap
  formations: Formation[]
  /** The song's waveform, or null to draw the counts alone (no song attached, or its file isn't here). */
  peaks: Peaks | null
  theme: Pick<CanvasTheme, 'floor' | 'outline' | 'grid' | 'gridCenter' | 'label' | 'wave' | 'marker'>
}

/**
 * Draws the timeline: count grid (thinned as you zoom out), set and count numbers,
 * the song's waveform lined up with the counts, and a marker for each formation.
 * Everything is placed by the pure maths in model/timeline.ts and sized to whole
 * device pixels so it stays sharp. `ctx` is expected to be scaled so one unit is one
 * CSS pixel.
 */
export function drawTimeline(ctx: CanvasRenderingContext2D, d: TimelineDrawing): void {
  const { width, height, dpr, view, theme } = d
  const bodyTop = RULER_HEIGHT
  const bodyHeight = Math.max(0, height - bodyTop)

  ctx.fillStyle = theme.floor
  ctx.fillRect(0, 0, width, height)

  // Waveform first, so the grid and markers sit on top of it.
  if (d.peaks && bodyHeight > 0) {
    const middle = bodyTop + bodyHeight / 2
    const reach = bodyHeight / 2 - 4
    ctx.fillStyle = theme.wave
    for (let x = 0; x < width; x++) {
      const from = countToSeconds(xToCount(x, view), d.tempo)
      const to = countToSeconds(xToCount(x + 1, view), d.tempo)
      const level = levelBetween(d.peaks, from, to)
      if (level <= 0) continue
      const half = Math.max(0.5, level * reach)
      ctx.fillRect(x, middle - half, 1, half * 2)
    }
  }

  // Grid lines and the numbers along the top.
  const lines = gridLines(view, width)
  // When sets are too close for a label each, label every few sets instead. Counted in set numbers (not
  // from the left edge) so the same sets stay labelled while you scroll.
  const step = gridStep(view.pxPerCount)
  const setLineSpacing = Math.max(COUNTS_PER_SET, step) * view.pxPerCount
  const labelEvery = Math.ceil(SET_LABEL_ROOM / setLineSpacing) * Math.max(1, step / COUNTS_PER_SET)
  ctx.font = '11px system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  for (const line of lines) {
    const stroke = strokeFor(line.isSetStart ? 1.5 : 1, dpr)
    const x = crispLine(line.x, stroke, dpr)
    ctx.strokeStyle = line.isSetStart ? theme.gridCenter : theme.grid
    ctx.lineWidth = stroke
    ctx.beginPath()
    ctx.moveTo(x, line.isSetStart ? 0 : bodyTop)
    ctx.lineTo(x, height)
    ctx.stroke()

    ctx.fillStyle = theme.label
    const setNumber = toSetAndCount(line.count).set
    if (line.isSetStart) {
      if (setNumber >= 1 && (setNumber - 1) % labelEvery === 0) ctx.fillText(`Set ${setNumber}`, line.x + 4, bodyTop / 4)
    } else if (!line.isSetStart && view.pxPerCount >= COUNT_LABEL_ROOM) {
      ctx.fillText(String(toSetAndCount(line.count).count), line.x + 4, (bodyTop * 3) / 4)
    }
  }
  // (the first count of each set is numbered too, when there's room per count)
  if (view.pxPerCount >= COUNT_LABEL_ROOM) {
    ctx.fillStyle = theme.label
    for (const line of lines) {
      if (line.isSetStart) ctx.fillText('1', line.x + 4, (bodyTop * 3) / 4)
    }
  }

  // The line under the ruler.
  const rulerStroke = strokeFor(1, dpr)
  ctx.strokeStyle = theme.outline
  ctx.lineWidth = rulerStroke
  ctx.beginPath()
  ctx.moveTo(0, crispLine(bodyTop, rulerStroke, dpr))
  ctx.lineTo(width, crispLine(bodyTop, rulerStroke, dpr))
  ctx.stroke()

  // A marker for each formation: a line through the timeline and its number on top.
  ctx.textAlign = 'center'
  d.formations.forEach((formation, index) => {
    const x = countToX(formation.count, view)
    if (x < -MARKER_LABEL_RADIUS || x > width + MARKER_LABEL_RADIUS) return
    const stroke = strokeFor(2, dpr)
    const px = crispLine(x, stroke, dpr)
    ctx.strokeStyle = theme.marker
    ctx.lineWidth = stroke
    ctx.beginPath()
    ctx.moveTo(px, bodyTop)
    ctx.lineTo(px, height)
    ctx.stroke()

    // The number badge stays fully on screen even when its marker is right at an edge.
    const badgeX = Math.min(Math.max(x, MARKER_LABEL_RADIUS + 1), width - MARKER_LABEL_RADIUS - 1)
    ctx.fillStyle = theme.marker
    ctx.beginPath()
    ctx.arc(badgeX, bodyTop - MARKER_LABEL_RADIUS - 2, MARKER_LABEL_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = theme.floor
    ctx.fillText(String(index + 1), badgeX, bodyTop - MARKER_LABEL_RADIUS - 2)
  })
  ctx.textAlign = 'start'
}
