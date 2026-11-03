// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Formation } from '../../model/types'
import { usePlayhead } from './usePlayhead'

const f = (id: string, count: number, transitionCounts = 4): Formation => ({
  id,
  name: id,
  count,
  transitionCounts,
  positions: {},
})

// Opening at 0, Cross at 16 (4-count travel), Finale at 40.
const list = [f('a', 0), f('b', 16), f('c', 40)]

const mockReducedMotion = (reduced: boolean) =>
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  mockReducedMotion(false)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const setup = (initial: Formation) =>
  renderHook(({ current }) => usePlayhead(list, current), { initialProps: { current: initial } })

const frames = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

describe('usePlayhead', () => {
  it('starts at the selected formation', () => {
    expect(setup(list[1]).result.current.count).toBe(16)
  })

  it('glides forward across the transition into the next formation, then lands on it', () => {
    const { result, rerender } = setup(list[0])
    rerender({ current: list[1] })

    // the glide starts where travel toward "b" begins (count 12), not at "a"
    expect(result.current.count).toBeGreaterThanOrEqual(12)
    expect(result.current.count).toBeLessThan(16)

    frames(350)
    const mid = result.current.count
    expect(mid).toBeGreaterThan(12)
    expect(mid).toBeLessThan(16)

    frames(500)
    expect(result.current.count).toBe(16)
  })

  it('glides backward by replaying the transition in reverse, then lands on the earlier formation', () => {
    const { result, rerender } = setup(list[1])
    rerender({ current: list[0] })

    frames(350)
    expect(result.current.count).toBeLessThan(16)
    expect(result.current.count).toBeGreaterThan(12)

    frames(500)
    expect(result.current.count).toBe(0)
  })

  it('jumps (no glide) when skipping over formations', () => {
    const { result, rerender } = setup(list[0])
    rerender({ current: list[2] })
    expect(result.current.count).toBe(40)
  })

  it('jumps when the user prefers reduced motion', () => {
    mockReducedMotion(true)
    const { result, rerender } = setup(list[0])
    rerender({ current: list[1] })
    expect(result.current.count).toBe(16)
  })

  it('jumps when the transition has zero length', () => {
    const instant = [f('a', 0), f('b', 16, 0)]
    const { result, rerender } = renderHook(({ current }) => usePlayhead(instant, current), {
      initialProps: { current: instant[0] },
    })
    rerender({ current: instant[1] })
    expect(result.current.count).toBe(16)
  })

  it('settle() stops a glide and snaps to the selected formation', () => {
    const { result, rerender } = setup(list[0])
    rerender({ current: list[1] })
    frames(200)
    act(() => result.current.settle())
    expect(result.current.count).toBe(16)
    frames(1000)
    expect(result.current.count).toBe(16)
  })

  it('follows the selected formation when its count is edited', () => {
    const { result, rerender } = setup(list[1])
    rerender({ current: { ...list[1], count: 24 } })
    expect(result.current.count).toBe(24)
  })

  it('cleans up a running glide when unmounted', () => {
    const { rerender, unmount } = setup(list[0])
    rerender({ current: list[1] })
    expect(() => {
      unmount()
      frames(1000)
    }).not.toThrow()
  })
})
