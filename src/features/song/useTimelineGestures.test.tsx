// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { xToCount, type TimelineBounds, type TimelineView } from '../../model/timeline'
import { useTimelineGestures } from './useTimelineGestures'

const bounds: TimelineBounds = { minCount: 0, maxCount: 400 }
const WIDTH = 300

function setup(view: TimelineView) {
  const onChange = vi.fn<(v: TimelineView) => void>()
  const onTap = vi.fn<(x: number) => void>()
  function Surface() {
    const ref = useRef<HTMLDivElement>(null)
    useTimelineGestures(ref, { view, widthPx: WIDTH, bounds, onChange, onTap })
    return <div ref={ref} data-testid="surface" />
  }
  const { unmount, container } = render(<Surface />)
  const surface = container.querySelector('[data-testid="surface"]') as HTMLElement
  surface.setPointerCapture = vi.fn()
  vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({ left: 10 } as DOMRect)
  return { onChange, onTap, surface, unmount, last: () => onChange.mock.calls.at(-1)![0] }
}

const pointer = (el: Element, type: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'pointerCancel', id: number, x: number) =>
  fireEvent[type](el, { pointerId: id, clientX: x })

describe('useTimelineGestures', () => {
  describe('dragging', () => {
    it('scrolls: dragging right brings earlier counts into view', () => {
      const t = setup({ startCount: 50, pxPerCount: 10 })
      pointer(t.surface, 'pointerDown', 1, 100)
      pointer(t.surface, 'pointerMove', 1, 150) // 50px right = 5 counts earlier
      expect(t.last().startCount).toBe(45)
      pointer(t.surface, 'pointerMove', 1, 130) // 20px back left
      expect(t.last().startCount).toBe(47)
    })

    it('stops at the start of the dance', () => {
      const t = setup({ startCount: 2, pxPerCount: 10 })
      pointer(t.surface, 'pointerDown', 1, 100)
      pointer(t.surface, 'pointerMove', 1, 1000)
      expect(t.last().startCount).toBe(0)
    })

    it('captures the pointer so the drag continues outside the timeline', () => {
      const t = setup({ startCount: 50, pxPerCount: 10 })
      pointer(t.surface, 'pointerDown', 7, 100)
      expect(t.surface.setPointerCapture).toHaveBeenCalledWith(7)
    })

    it('ignores movement when nothing is pressed, and after the pointer is released or cancelled', () => {
      const t = setup({ startCount: 50, pxPerCount: 10 })
      pointer(t.surface, 'pointerMove', 1, 100)
      pointer(t.surface, 'pointerDown', 1, 100)
      pointer(t.surface, 'pointerUp', 1, 100)
      pointer(t.surface, 'pointerMove', 1, 200)
      pointer(t.surface, 'pointerDown', 2, 100)
      pointer(t.surface, 'pointerCancel', 2, 100)
      pointer(t.surface, 'pointerMove', 2, 200)
      expect(t.onChange).not.toHaveBeenCalled()
    })
  })

  describe('wheel', () => {
    it('zooms around the pointer, keeping the count under it where it is', () => {
      const view = { startCount: 40, pxPerCount: 10 }
      const t = setup(view)
      const anchorX = 110 // 100px from the left edge of the surface (left = 10)
      const before = xToCount(100, view)
      fireEvent.wheel(t.surface, { deltaY: -100, clientX: anchorX })
      expect(t.last().pxPerCount).toBeGreaterThan(10) // scrolling up zooms in
      expect(xToCount(100, t.last())).toBeCloseTo(before)
      fireEvent.wheel(t.surface, { deltaY: 100, clientX: anchorX })
      expect(t.last().pxPerCount).toBeLessThan(t.onChange.mock.calls[0][0].pxPerCount)
    })

    it('stops the page from scrolling or zooming while the pointer is over the timeline', () => {
      const t = setup({ startCount: 0, pxPerCount: 10 })
      expect(fireEvent.wheel(t.surface, { deltaY: -100, clientX: 50 })).toBe(false) // default prevented
    })

    it('pans on sideways scrolling instead of zooming', () => {
      const t = setup({ startCount: 50, pxPerCount: 10 })
      fireEvent.wheel(t.surface, { deltaX: 60, deltaY: 5, clientX: 50 })
      expect(t.last().pxPerCount).toBe(10)
      expect(t.last().startCount).toBeCloseTo(56) // 60px = 6 counts later
    })

    it('treats wheels that report lines like ones that report pixels, only scaled up', () => {
      const pixels = setup({ startCount: 40, pxPerCount: 10 })
      fireEvent.wheel(pixels.surface, { deltaY: -16, deltaMode: 0, clientX: 60 })
      const lines = setup({ startCount: 40, pxPerCount: 10 })
      fireEvent.wheel(lines.surface, { deltaY: -1, deltaMode: 1, clientX: 60 })
      expect(lines.last().pxPerCount).toBeCloseTo(pixels.last().pxPerCount)
    })
  })

  describe('pinching', () => {
    it('zooms by how much the fingers spread, around the point between them', () => {
      const view = { startCount: 40, pxPerCount: 10 }
      const t = setup(view)
      pointer(t.surface, 'pointerDown', 1, 100)
      pointer(t.surface, 'pointerDown', 2, 200) // spread 100
      pointer(t.surface, 'pointerMove', 2, 300) // spread 200: twice as far apart; midpoint now 200 -> 190 from the left
      const under = xToCount(190, view) // the count under the fingers before zooming
      expect(t.last().pxPerCount).toBeCloseTo(20)
      expect(xToCount(190, t.last())).toBeCloseTo(under)
    })

    it('zooms in when the fingers spread and out when they come together', () => {
      const t = setup({ startCount: 40, pxPerCount: 10 })
      pointer(t.surface, 'pointerDown', 1, 100)
      pointer(t.surface, 'pointerDown', 2, 200)
      pointer(t.surface, 'pointerMove', 2, 260)
      expect(t.last().pxPerCount).toBeGreaterThan(10)
      pointer(t.surface, 'pointerMove', 2, 140)
      expect(t.last().pxPerCount).toBeLessThan(t.onChange.mock.calls[0][0].pxPerCount)
    })

    it('carries on scrolling with the remaining finger when one is lifted', () => {
      const t = setup({ startCount: 50, pxPerCount: 10 })
      pointer(t.surface, 'pointerDown', 1, 100)
      pointer(t.surface, 'pointerDown', 2, 200)
      pointer(t.surface, 'pointerUp', 2, 200)
      t.onChange.mockClear()
      pointer(t.surface, 'pointerMove', 1, 130) // 30px right = 3 counts earlier
      expect(t.last().startCount).toBeCloseTo(47)
      expect(t.last().pxPerCount).toBe(10)
    })

    it('does not zoom wildly if both fingers start on the same spot (no spread to compare with yet)', () => {
      const t = setup({ startCount: 50, pxPerCount: 10 })
      pointer(t.surface, 'pointerDown', 1, 100)
      pointer(t.surface, 'pointerDown', 2, 100) // spread 0
      pointer(t.surface, 'pointerMove', 2, 150)
      expect(t.onChange).not.toHaveBeenCalled()
      pointer(t.surface, 'pointerMove', 2, 200) // now there is a spread to measure against
      expect(Number.isFinite(t.last().pxPerCount)).toBe(true)
      expect(t.last().pxPerCount).toBeCloseTo(20) // 50 -> 100 apart
    })
  })

  it('stops responding when removed', () => {
    const t = setup({ startCount: 50, pxPerCount: 10 })
    t.unmount()
    pointer(t.surface, 'pointerDown', 1, 100)
    pointer(t.surface, 'pointerMove', 1, 150)
    fireEvent.wheel(t.surface, { deltaY: -100 })
    expect(t.onChange).not.toHaveBeenCalled()
  })
  describe('tapping', () => {
    it('is a tap when the pointer goes down and up in the same place, and says where (from the left edge)', () => {
      const t = setup({ startCount: 50, pxPerCount: 10 })
      pointer(t.surface, 'pointerDown', 1, 110)
      pointer(t.surface, 'pointerUp', 1, 110)
      expect(t.onTap).toHaveBeenCalledExactlyOnceWith(100) // the surface starts at x = 10
      expect(t.onChange).not.toHaveBeenCalled() // and it did not scroll
    })

    it('allows a little wobble of the finger', () => {
      const t = setup({ startCount: 50, pxPerCount: 10 })
      pointer(t.surface, 'pointerDown', 1, 110)
      pointer(t.surface, 'pointerMove', 1, 113)
      pointer(t.surface, 'pointerUp', 1, 113)
      expect(t.onTap).toHaveBeenCalledTimes(1)
    })

    it('is a drag, not a tap, once the pointer has really moved (even if it comes back)', () => {
      const t = setup({ startCount: 50, pxPerCount: 10 })
      pointer(t.surface, 'pointerDown', 1, 110)
      pointer(t.surface, 'pointerMove', 1, 160)
      pointer(t.surface, 'pointerMove', 1, 110)
      pointer(t.surface, 'pointerUp', 1, 110)
      expect(t.onTap).not.toHaveBeenCalled()
    })

    it('is not a tap when held for a long time', () => {
      vi.useFakeTimers({ toFake: ['performance'] })
      const t = setup({ startCount: 50, pxPerCount: 10 })
      pointer(t.surface, 'pointerDown', 1, 110)
      vi.advanceTimersByTime(800)
      pointer(t.surface, 'pointerUp', 1, 110)
      expect(t.onTap).not.toHaveBeenCalled()
      vi.useRealTimers()
    })

    it('is not a tap when two fingers were involved (a pinch)', () => {
      const t = setup({ startCount: 50, pxPerCount: 10 })
      pointer(t.surface, 'pointerDown', 1, 100)
      pointer(t.surface, 'pointerDown', 2, 200)
      pointer(t.surface, 'pointerUp', 2, 200)
      pointer(t.surface, 'pointerUp', 1, 100)
      expect(t.onTap).not.toHaveBeenCalled()
    })

    it('is not a tap when the gesture was cancelled', () => {
      const t = setup({ startCount: 50, pxPerCount: 10 })
      pointer(t.surface, 'pointerDown', 1, 110)
      pointer(t.surface, 'pointerCancel', 1, 110)
      expect(t.onTap).not.toHaveBeenCalled()
    })

    it('copes with no tap handler being given', () => {
      const onChange = vi.fn()
      function Surface() {
        const ref = useRef<HTMLDivElement>(null)
        useTimelineGestures(ref, { view: { startCount: 0, pxPerCount: 10 }, widthPx: WIDTH, bounds, onChange })
        return <div ref={ref} data-testid="plain" />
      }
      const { container } = render(<Surface />)
      const el = container.querySelector('[data-testid="plain"]') as HTMLElement
      el.setPointerCapture = vi.fn()
      pointer(el, 'pointerDown', 1, 10)
      expect(() => pointer(el, 'pointerUp', 1, 10)).not.toThrow()
    })
  })

})
