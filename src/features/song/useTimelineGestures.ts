import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { panBy, zoomAt, type TimelineBounds, type TimelineView } from '../../model/timeline'

interface Options {
  view: TimelineView
  /** Width of the timeline in CSS pixels. */
  widthPx: number
  bounds: TimelineBounds
  onChange: (view: TimelineView) => void
}

/** How strongly the mouse wheel zooms: one typical notch (about 100) is a bit over 15%. */
const WHEEL_ZOOM = 0.0015
/** Wheels that report lines instead of pixels (some browsers) are scaled up to match. */
const LINE_PX = 16

/**
 * Makes an element scroll and zoom the timeline: drag to scroll, wheel or trackpad
 * to zoom around the pointer (sideways scrolling pans), two fingers to pinch-zoom
 * around the point between them. The maths lives in model/timeline.ts; this only
 * turns pointer events into calls to it. The element needs `touch-action: none`
 * so touch gestures reach it instead of scrolling the page.
 */
export function useTimelineGestures(ref: RefObject<HTMLElement | null>, options: Options) {
  // The handlers read the latest options without being re-attached on every render.
  const latest = useRef(options)
  useLayoutEffect(() => {
    latest.current = options
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const pointers = new Map<number, number>() // pointer id -> x
    const pinch = { spread: 0 } // how far apart two fingers were at the last event

    const left = () => el.getBoundingClientRect().left
    const spread = () => {
      const [a, b] = [...pointers.values()]
      return Math.abs(a - b)
    }
    const apply = (next: TimelineView) => {
      latest.current.view = next // so events arriving before the next render build on it
      latest.current.onChange(next)
    }

    const onDown = (e: PointerEvent) => {
      el.setPointerCapture?.(e.pointerId)
      pointers.set(e.pointerId, e.clientX)
      if (pointers.size === 2) pinch.spread = spread()
    }

    const onMove = (e: PointerEvent) => {
      const before = pointers.get(e.pointerId)
      if (before === undefined) return
      pointers.set(e.pointerId, e.clientX)
      const { view, widthPx, bounds } = latest.current
      if (pointers.size === 1) {
        apply(panBy(view, e.clientX - before, widthPx, bounds))
      } else if (pointers.size === 2) {
        const now = spread()
        if (pinch.spread > 0 && now > 0) {
          const [a, b] = [...pointers.values()]
          apply(zoomAt(view, (a + b) / 2 - left(), now / pinch.spread, widthPx, bounds))
        }
        pinch.spread = now
      }
    }

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      pinch.spread = pointers.size === 2 ? spread() : 0
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault() // zoom the timeline, not the page
      const { view, widthPx, bounds } = latest.current
      const unit = e.deltaMode === 1 ? LINE_PX : 1
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        apply(panBy(view, -e.deltaX * unit, widthPx, bounds))
      } else {
        apply(zoomAt(view, e.clientX - left(), Math.exp(-e.deltaY * unit * WHEEL_ZOOM), widthPx, bounds))
      }
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [ref])
}
