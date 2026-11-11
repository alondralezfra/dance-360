import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { formatDuration } from '../../lib/format'
import { useDevicePixelRatio } from '../../lib/useDevicePixelRatio'
import { useElementSize } from '../../lib/useElementSize'
import { placeFormationAt } from '../../model/tapSnap'
import { formatCount } from '../../model/tempo'
import {
  clampView,
  fitView,
  followPlayhead,
  nearestMarker,
  snapCountAt,
  timelineBounds,
  zoomAt,
  type TimelineView,
} from '../../model/timeline'
import { useProject } from '../../store/projectStore'
import { useSong } from '../../store/songStore'
import { playheadClock, useTransport } from '../../store/transport'
import { useCanvasTheme } from '../../theme/useCanvasTheme'
import { drawTimeline } from './drawTimeline'
import { useTimelineGestures } from './useTimelineGestures'

const HEIGHT = 190
/** How much one press of a zoom button changes the zoom. */
const ZOOM_STEP = 1.5
/** How close (in pixels) a press has to be to a formation marker to grab it: a finger needs more than a mouse. */
const GRAB_MOUSE_PX = 12
const GRAB_TOUCH_PX = 22

/**
 * The song laid out against the counts: waveform, set and count grid, and a marker
 * for each formation. Drag to scroll, wheel or pinch to zoom, tap to move the playhead, and drag a
 * numbered marker to move that formation to another count (it snaps to whole counts, and one drag is one undo step).
 */
export function TimelinePanel() {
  const tempo = useProject((s) => s.tempo)
  const song = useProject((s) => s.song)
  const formations = useProject((s) => s.formations)
  const peaks = useSong((s) => s.peaks)
  const playing = useTransport((s) => s.playing)
  const seek = useTransport((s) => s.seek)
  const placeFormation = useProject((s) => s.placeFormation)
  const theme = useCanvasTheme()
  const dpr = useDevicePixelRatio()
  const [boxRef, size] = useElementSize<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const width = Math.floor(size.width)

  // What the view may show: from where the audio begins (before count 0 if the song has an intro) to the end of the dance.
  const bounds = useMemo(() => timelineBounds(formations, song, tempo), [formations, song, tempo])

  // `null` means "fit everything". It stays that way until the person zooms or scrolls.
  const [chosen, setChosen] = useState<TimelineView | null>(null)
  // While the song plays the view turns the page to keep the playhead in sight, until the person
  // scrolls or zooms it themselves; pressing play again hands control back.
  const following = useRef(true)
  const choose = (next: TimelineView | null) => {
    following.current = false
    setChosen(next)
  }
  useEffect(() => {
    following.current = true
  }, [playing])
  const view = useMemo(
    () => (width > 0 ? clampView(chosen ?? fitView(width, bounds), width, bounds) : { startCount: 0, pxPerCount: 10 }),
    [chosen, width, bounds],
  )

  // A marker being dragged: which, and the count it would land on. Nothing is saved until it is let go.
  const [drag, setDrag] = useState<{ id: string; count: number } | null>(null)
  const dragCount = (x: number) => Math.min(snapCountAt(x, view, 0), bounds.maxCount)
  const shown = useMemo(() => (drag ? placeFormationAt(formations, drag.id, drag.count) : formations), [formations, drag])
  const callout = useMemo(() => {
    const landed = drag && shown.find((f) => f.id === drag.id)
    return landed ? { count: landed.count, text: formatCount(landed.count) } : null
  }, [drag, shown])

  useTimelineGestures(boxRef, {
    view,
    widthPx: width,
    bounds,
    onChange: choose,
    // A tap or click puts the playhead there (on the nearest count).
    onTap: (x) => seek(snapCountAt(x, view, bounds.minCount)),
    markerAt: (x, touch) => nearestMarker(formations, x, view, touch ? GRAB_TOUCH_PX : GRAB_MOUSE_PX),
    onMarkerDrag: (id, x) => setDrag({ id, count: dragCount(x) }),
    onMarkerDrop: (id, x) => {
      placeFormation(id, dragCount(x))
      setDrag(null)
    },
    onMarkerCancel: () => setDrag(null),
  })

  // The latest view, for the playhead follower below (which runs every frame and must not be re-attached each time).
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || width <= 0) return
    // (Resizing clears the canvas, so only do it when the size really changed.)
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(HEIGHT * dpr)) {
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(HEIGHT * dpr)
    }
    // The playhead moves every frame: redraw the canvas directly instead of re-rendering React.
    const paint = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawTimeline(ctx, {
        width,
        height: HEIGHT,
        dpr,
        view,
        tempo,
        formations: shown,
        peaks,
        playhead: playheadClock.get(),
        callout,
        theme,
      })
    }
    paint()
    return playheadClock.subscribe(paint)
  }, [width, dpr, view, tempo, shown, callout, peaks, theme])

  // Turn the page when the playing song runs off the edge. (Only the rare page turn is a React update.)
  useEffect(
    () =>
      playheadClock.subscribe(() => {
        if (!following.current || !useTransport.getState().playing || width <= 0) return
        const next = followPlayhead(viewRef.current, playheadClock.get(), width, bounds)
        if (next !== viewRef.current) setChosen(next)
      }),
    [width, bounds],
  )

  const zoom = (factor: number) => choose(zoomAt(view, width / 2, factor, width, bounds))
  const summary =
    `Timeline of ${formations.length} formation${formations.length === 1 ? '' : 's'} over ${bounds.maxCount} counts` +
    (song && peaks ? `, with the waveform of ${song.name} (${formatDuration(song.durationSec)}).` : '.')

  return (
    <section aria-labelledby="timeline-heading">
      <SectionHeader
        id="timeline-heading"
        title="Timeline"
        actions={
          <div className="flex items-center gap-2">
            <IconButton icon="minus" label="Zoom out" onClick={() => zoom(1 / ZOOM_STEP)} />
            <IconButton icon="plus" label="Zoom in" onClick={() => zoom(ZOOM_STEP)} />
            <Button onClick={() => choose(null)}>Fit</Button>
          </div>
        }
      >
        Tap to move the playhead. Drag to scroll. Use the mouse wheel, a trackpad or two fingers to zoom. Numbered markers are your formations: drag one to move it.
      </SectionHeader>

      <div
        ref={boxRef}
        className="relative w-full cursor-grab touch-none overflow-hidden rounded-lg border border-border select-none active:cursor-grabbing"
        style={{ height: HEIGHT }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={summary}
          style={{ width, height: HEIGHT, display: 'block' }}
        />
      </div>
    </section>
  )
}
