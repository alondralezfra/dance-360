// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Formation } from '../../model/types'
import { createPlayheadClock } from '../../lib/playheadClock'
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

// The hook drives a clock; these tests watch the clock's count.
const useDrivenClock = (formations: Formation[], current: Formation, options?: Parameters<typeof usePlayhead>[3]) => {
  const [clock] = useState(() => createPlayheadClock(current.count))
  const { settle } = usePlayhead(clock, formations, current, options)
  return { count: clock.get, settle, clock }
}

type Props = { current: Formation; opts?: Parameters<typeof usePlayhead>[3] }

const setup = (initial: Formation, options?: Parameters<typeof usePlayhead>[3]) =>
  renderHook(({ current, opts }: Props) => useDrivenClock(list, current, opts), {
    initialProps: { current: initial, opts: options } as Props,
  })

const frames = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

describe('usePlayhead', () => {
  it('starts at the selected formation', () => {
    expect(setup(list[1]).result.current.count()).toBe(16)
  })

  it('glides forward across the transition into the next formation, then lands on it', () => {
    const { result, rerender } = setup(list[0])
    rerender({ current: list[1] })

    // the glide starts where travel toward "b" begins (count 12), not at "a"
    expect(result.current.count()).toBeGreaterThanOrEqual(12)
    expect(result.current.count()).toBeLessThan(16)

    frames(350)
    const mid = result.current.count()
    expect(mid).toBeGreaterThan(12)
    expect(mid).toBeLessThan(16)

    frames(500)
    expect(result.current.count()).toBe(16)
  })

  it('glides backward by replaying the transition in reverse, then lands on the earlier formation', () => {
    const { result, rerender } = setup(list[1])
    rerender({ current: list[0] })

    frames(350)
    expect(result.current.count()).toBeLessThan(16)
    expect(result.current.count()).toBeGreaterThan(12)

    frames(500)
    expect(result.current.count()).toBe(0)
  })

  it('jumps (no glide) when skipping over formations', () => {
    const { result, rerender } = setup(list[0])
    rerender({ current: list[2] })
    expect(result.current.count()).toBe(40)
  })

  it('jumps when the user prefers reduced motion', () => {
    mockReducedMotion(true)
    const { result, rerender } = setup(list[0])
    rerender({ current: list[1] })
    expect(result.current.count()).toBe(16)
  })

  it('jumps when the transition has zero length', () => {
    const instant = [f('a', 0), f('b', 16, 0)]
    const { result, rerender } = renderHook(({ current }) => useDrivenClock(instant, current), {
      initialProps: { current: instant[0] },
    })
    rerender({ current: instant[1] })
    expect(result.current.count()).toBe(16)
  })

  it('settle() stops a glide and snaps to the selected formation', () => {
    const { result, rerender } = setup(list[0])
    rerender({ current: list[1] })
    frames(200)
    act(() => result.current.settle())
    expect(result.current.count()).toBe(16)
    frames(1000)
    expect(result.current.count()).toBe(16)
  })

  it('follows the selected formation when its count is edited', () => {
    const { result, rerender } = setup(list[1])
    rerender({ current: { ...list[1], count: 24 } })
    expect(result.current.count()).toBe(24)
  })

  describe('when the song is moving the playhead', () => {
    it('leaves the playhead alone while the song plays, however the selection changes', () => {
      const { result, rerender } = setup(list[0], { frozen: true })
      act(() => result.current.clock.set(5)) // the song put the playhead here
      rerender({ current: list[1], opts: { frozen: true } })
      frames(1000)
      expect(result.current.count()).toBe(5)
    })

    it('leaves the playhead alone when the selection only followed the playhead (no preview glide)', () => {
      const { result, rerender } = setup(list[0], { followedPlayhead: true })
      act(() => result.current.clock.set(14))
      rerender({ current: list[1], opts: { followedPlayhead: true } })
      frames(1000)
      expect(result.current.count()).toBe(14)
    })

    it('still previews a step the person takes next, from the formation the playhead had reached', () => {
      const { result, rerender } = setup(list[0], { followedPlayhead: true })
      rerender({ current: list[1], opts: { followedPlayhead: true } }) // the playhead moved on to b
      act(() => result.current.clock.set(16))
      rerender({ current: list[0], opts: { followedPlayhead: false } }) // the person steps back to a
      frames(350)
      expect(result.current.count()).toBeGreaterThan(0) // gliding back, not jumped
      expect(result.current.count()).toBeLessThan(16)
      frames(500)
      expect(result.current.count()).toBe(0)
    })

    it('does not jump the playhead when playing stops and nothing was chosen', () => {
      const { result, rerender } = setup(list[1], { frozen: true })
      act(() => result.current.clock.set(23.5)) // paused part-way to the next formation
      rerender({ current: list[1], opts: { frozen: false } })
      expect(result.current.count()).toBe(23.5)
    })
  })

  it('does not move the playhead for an edit that leaves the formation where it lands (a rename)', () => {
    const { result, rerender } = setup(list[1])
    act(() => result.current.clock.set(13.25)) // paused between formations
    rerender({ current: { ...list[1], name: 'Renamed' }, opts: undefined })
    expect(result.current.count()).toBe(13.25)
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
