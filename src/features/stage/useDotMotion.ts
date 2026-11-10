import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import type Konva from 'konva'
import { positionsAt } from '../../model/playback'
import type { Formation, Id } from '../../model/types'
import type { PlayheadClock } from '../../lib/playheadClock'

interface Options {
  clock: PlayheadClock
  formations: Formation[]
  /** Feet -> pixel position of a dot on screen (already snapped to device pixels). */
  toDotPx: (x: number, y: number) => { x: number; y: number }
  /** The canvas layer the dots are on; asked to redraw after they move. */
  layerRef: RefObject<Konva.Layer | null>
}

/**
 * Moves the dots when the playhead clock ticks, straight on the canvas, without
 * going through React. A glide (and later audio playback) changes the count every
 * frame; re-rendering the whole stage for each would be far too slow on a phone.
 *
 * Positions still come only from `positionsAt` (the pure playback function).
 * React keeps rendering each dot's *resting* position (the selected formation);
 * the glide moves nodes away from it and ends back on it.
 *
 * Returns the function dots call to hand over their canvas node.
 */
export function useDotMotion({ clock, formations, toDotPx, layerRef }: Options) {
  const nodes = useRef(new Map<Id, Konva.Group>())

  // The tick handler reads the latest of these without being re-subscribed every render.
  const latest = useRef({ formations, toDotPx })
  useLayoutEffect(() => {
    latest.current = { formations, toDotPx }
  })

  useEffect(
    () =>
      clock.subscribe(() => {
        const { formations: list, toDotPx: place } = latest.current
        const positions = positionsAt(list, clock.get())
        for (const [id, node] of nodes.current) {
          const p = positions[id]
          if (!p) continue
          const px = place(p.x, p.y)
          node.position(px)
        }
        layerRef.current?.batchDraw()
      }),
    [clock, layerRef],
  )

  return useCallback((id: Id, node: Konva.Group | null) => {
    if (node) nodes.current.set(id, node)
    else nodes.current.delete(id)
  }, [])
}
