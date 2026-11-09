// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { positionsAt } from '../../model/playback'
import type { Formation } from '../../model/types'
import { createPlayheadClock } from './playheadClock'
import { useDotMotion } from './useDotMotion'

const formation = (id: string, count: number, x: number): Formation => ({
  id,
  name: id,
  count,
  transitionCounts: 4,
  positions: { a: { x, y: 0 }, b: { x: x + 10, y: 0 } },
})
const list = [formation('one', 0, 0), formation('two', 16, 20)]

// Feet -> pixels: simple and checkable (1 foot = 10 px, offset by 5).
const toDotPx = (x: number, y: number) => ({ x: 5 + x * 10, y: 5 + y * 10 })

const fakeNode = () => ({ position: vi.fn() })
const fakeLayer = () => ({ batchDraw: vi.fn() })

function setup(formations = list) {
  const clock = createPlayheadClock(0)
  const layer = fakeLayer()
  const layerRef = { current: layer as never }
  const hook = renderHook((props) => useDotMotion({ clock, layerRef, toDotPx, ...props }), {
    initialProps: { formations },
  })
  const a = fakeNode()
  const b = fakeNode()
  hook.result.current('a', a as never)
  hook.result.current('b', b as never)
  return { clock, layer, a, b, hook }
}

describe('useDotMotion', () => {
  it('moves each registered dot to where positionsAt says it is at the clock count, and redraws', () => {
    const { clock, a, b, layer } = setup()
    clock.set(14) // part-way through the travel into "two" (which starts at count 12)
    const expected = positionsAt(list, 14)
    expect(a.position).toHaveBeenLastCalledWith(toDotPx(expected.a.x, expected.a.y))
    expect(b.position).toHaveBeenLastCalledWith(toDotPx(expected.b.x, expected.b.y))
    expect(expected.a.x).toBeGreaterThan(0) // really mid-glide, not at either end
    expect(expected.a.x).toBeLessThan(20)
    expect(layer.batchDraw).toHaveBeenCalledTimes(1)
  })

  it('lands exactly on the formation at its count', () => {
    const { clock, a } = setup()
    clock.set(16)
    expect(a.position).toHaveBeenLastCalledWith(toDotPx(20, 0))
  })

  it('does nothing until the clock moves', () => {
    const { a, layer } = setup()
    expect(a.position).not.toHaveBeenCalled()
    expect(layer.batchDraw).not.toHaveBeenCalled()
  })

  it('skips dancers with no position in the formations, and dots that have gone away', () => {
    const { clock, a, b, hook } = setup()
    const ghost = fakeNode()
    hook.result.current('nobody', ghost as never)
    hook.result.current('b', null) // b's dot was removed
    clock.set(16)
    expect(ghost.position).not.toHaveBeenCalled()
    expect(b.position).not.toHaveBeenCalled()
    expect(a.position).toHaveBeenCalled()
  })

  it('uses the latest formations without having to resubscribe', () => {
    const { clock, a, hook } = setup()
    hook.rerender({ formations: [formation('one', 0, 0), formation('two', 16, 30)] })
    clock.set(16)
    expect(a.position).toHaveBeenLastCalledWith(toDotPx(30, 0))
  })

  it('stops listening to the clock when unmounted', () => {
    const { clock, a, hook } = setup()
    hook.unmount()
    clock.set(16)
    expect(a.position).not.toHaveBeenCalled()
  })

  it('copes with the canvas layer not existing yet', () => {
    const clock = createPlayheadClock(0)
    const { result } = renderHook(() => useDotMotion({ clock, formations: list, toDotPx, layerRef: { current: null } }))
    const node = fakeNode()
    result.current('a', node as never)
    expect(() => clock.set(16)).not.toThrow()
    expect(node.position).toHaveBeenCalled()
  })
})
