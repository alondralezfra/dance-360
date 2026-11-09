import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { formatDuration } from '../../lib/format'
import { useDevicePixelRatio } from '../../lib/useDevicePixelRatio'
import { useElementSize } from '../../lib/useElementSize'
import { secondsToCount } from '../../model/tempo'
import { clampView, danceLength, fitView, zoomAt, type TimelineView } from '../../model/timeline'
import { useProject } from '../../store/projectStore'
import { useSong } from '../../store/songStore'
import { useCanvasTheme } from '../../theme/useCanvasTheme'
import { drawTimeline } from './drawTimeline'
import { useTimelineGestures } from './useTimelineGestures'

const HEIGHT = 190
/** How much one press of a zoom button changes the zoom. */
const ZOOM_STEP = 1.5

/**
 * The song laid out against the counts: waveform, set and count grid, and a marker
 * for each formation. Drag to scroll, wheel or pinch to zoom. (Placing formations on
 * it comes in a later slice; today it shows where they are.)
 */
export function TimelinePanel() {
  const tempo = useProject((s) => s.tempo)
  const song = useProject((s) => s.song)
  const formations = useProject((s) => s.formations)
  const peaks = useSong((s) => s.peaks)
  const theme = useCanvasTheme()
  const dpr = useDevicePixelRatio()
  const [boxRef, size] = useElementSize<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const width = Math.floor(size.width)

  // What the view may show: from where the audio begins (before count 0 if the song has an intro) to the end of the dance.
  const bounds = useMemo(
    () => ({
      minCount: Math.min(0, Math.floor(secondsToCount(0, tempo))),
      maxCount: danceLength(formations, song, tempo),
    }),
    [tempo, formations, song],
  )

  // `null` means "fit everything". It stays that way until the person zooms or scrolls.
  const [chosen, setChosen] = useState<TimelineView | null>(null)
  const view = useMemo(
    () => (width > 0 ? clampView(chosen ?? fitView(width, bounds), width, bounds) : { startCount: 0, pxPerCount: 10 }),
    [chosen, width, bounds],
  )

  useTimelineGestures(boxRef, { view, widthPx: width, bounds, onChange: setChosen })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || width <= 0) return
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(HEIGHT * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawTimeline(ctx, { width, height: HEIGHT, dpr, view, tempo, formations, peaks, theme })
  }, [width, dpr, view, tempo, formations, peaks, theme])

  const zoom = (factor: number) => setChosen(zoomAt(view, width / 2, factor, width, bounds))
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
            <Button onClick={() => setChosen(null)}>Fit</Button>
          </div>
        }
      >
        Drag to scroll. Use the mouse wheel, a trackpad or two fingers to zoom. Numbered markers are your formations.
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
