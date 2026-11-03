import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { transitionStart } from '../../model/playback'
import type { Formation } from '../../model/types'

/** How long the preview glide takes when you step between formations (ms). */
const GLIDE_MS = 700

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The count the stage is currently showing.
 *
 * Normally that's just the selected formation's count. When you step to the
 * neighbouring formation, the count is animated across that transition so the
 * dots glide. Positions are NOT computed here: the stage feeds this count to
 * the pure `positionsAt()` function, the same way audio playback will later.
 */
export function usePlayhead(formations: Formation[], current: Formation) {
  const [count, setCount] = useState(current.count)
  const lastId = useRef(current.id)
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
    setCount(currentCountRef.current)
  }, [cancel])

  // useLayoutEffect runs before the browser paints, so there's no flicker.
  useLayoutEffect(() => {
    const switched = lastId.current !== current.id
    const fromId = lastId.current
    lastId.current = current.id
    cancel()

    const list = formationsRef.current
    const from = list.find((f) => f.id === fromId)
    const fromIndex = from ? list.indexOf(from) : -1
    const toIndex = list.indexOf(current)
    const step = toIndex - fromIndex

    if (!switched || !from || Math.abs(step) !== 1 || prefersReducedMotion()) {
      setCount(current.count)
      return
    }

    // Stepping forward replays the transition INTO the new formation;
    // stepping back plays the transition OUT of the one we left, in reverse.
    const [start, end] =
      step === 1
        ? [transitionStart(current, from), current.count]
        : [from.count, transitionStart(from, current)]
    if (start === end) {
      setCount(current.count)
      return
    }

    setCount(start)
    const began = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - began) / GLIDE_MS)
      if (t < 1) {
        setCount(start + (end - start) * t)
        frame.current = requestAnimationFrame(tick)
      } else {
        frame.current = null
        setCount(current.count)
      }
    }
    frame.current = requestAnimationFrame(tick)
    return cancel
  }, [current, cancel])

  return { count, settle }
}
