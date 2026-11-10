import { useCallback, useLayoutEffect, useRef } from 'react'
import { transitionStart } from '../../model/playback'
import type { Formation } from '../../model/types'
import type { PlayheadClock } from '../../lib/playheadClock'

/** How long the preview glide takes when you step between formations (ms). */
const GLIDE_MS = 700

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Drives the playhead clock: the count the stage is currently showing.
 *
 * Normally that's just the selected formation's count. When you step to the
 * neighbouring formation, the count is animated across that transition so the
 * dots glide. Positions are NOT computed here: the stage feeds the clock's count
 * to the pure `positionsAt()` function. The song's transport (store/transport.ts) sets
 * the same clock while it plays; then this stays out of the way (see the options).
 */
export interface PlayheadOptions {
  /** The song is playing and moving the playhead itself: do nothing. */
  frozen?: boolean
  /** The selection only changed because the playhead moved past a formation: do not preview a step. */
  followedPlayhead?: boolean
}

export function usePlayhead(
  clock: PlayheadClock,
  formations: Formation[],
  current: Formation,
  { frozen = false, followedPlayhead = false }: PlayheadOptions = {},
) {
  const lastId = useRef(current.id)
  const lastCount = useRef(current.count)
  const frame = useRef<number | null>(null)
  const formationsRef = useRef(formations)
  const currentCountRef = useRef(current.count)

  useLayoutEffect(() => {
    formationsRef.current = formations
    currentCountRef.current = current.count
  })

  const cancel = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
  }, [])

  /** Stop any glide and jump to the selected formation (e.g. when a drag starts). */
  const settle = useCallback(() => {
    cancel()
    clock.set(currentCountRef.current)
  }, [cancel, clock])

  // useLayoutEffect runs before the browser paints, so there's no flicker.
  useLayoutEffect(() => {
    const switched = lastId.current !== current.id
    const fromId = lastId.current
    lastId.current = current.id
    const countChanged = lastCount.current !== current.count
    lastCount.current = current.count
    cancel()

    // The song (or a jump in it) moved the playhead: it is already where it should be.
    if (frozen || followedPlayhead) return
    // An edit that doesn't change when the formation lands (a rename, a moved dot) leaves the playhead where it is.
    if (!switched && !countChanged) return

    const list = formationsRef.current
    const from = list.find((f) => f.id === fromId)
    const fromIndex = from ? list.indexOf(from) : -1
    const toIndex = list.indexOf(current)
    const step = toIndex - fromIndex

    if (!switched || !from || Math.abs(step) !== 1 || prefersReducedMotion()) {
      clock.set(current.count)
      return
    }

    // Stepping forward replays the transition INTO the new formation;
    // stepping back plays the transition OUT of the one we left, in reverse.
    const [start, end] =
      step === 1
        ? [transitionStart(current, from), current.count]
        : [from.count, transitionStart(from, current)]
    if (start === end) {
      clock.set(current.count)
      return
    }

    clock.set(start)
    const began = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - began) / GLIDE_MS)
      if (t < 1) {
        clock.set(start + (end - start) * t)
        frame.current = requestAnimationFrame(tick)
      } else {
        frame.current = null
        clock.set(current.count)
      }
    }
    frame.current = requestAnimationFrame(tick)
    return cancel
  }, [current, cancel, clock, frozen, followedPlayhead])

  return { settle }
}
