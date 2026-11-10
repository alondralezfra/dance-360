import { describe, expect, it, vi } from 'vitest'
import { createPlayheadClock } from './playheadClock'

describe('playhead clock', () => {
  it('holds the count it was given and updates it', () => {
    const clock = createPlayheadClock(8)
    expect(clock.get()).toBe(8)
    clock.set(12.5)
    expect(clock.get()).toBe(12.5)
  })

  it('tells every subscriber on a change, but not when the count is unchanged', () => {
    const clock = createPlayheadClock(0)
    const a = vi.fn()
    const b = vi.fn()
    clock.subscribe(a)
    clock.subscribe(b)
    clock.set(1)
    clock.set(1)
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('subscribers see the new value when called', () => {
    const clock = createPlayheadClock(0)
    const seen: number[] = []
    clock.subscribe(() => seen.push(clock.get()))
    clock.set(3)
    clock.set(4)
    expect(seen).toEqual([3, 4])
  })

  it('stops telling a subscriber after it unsubscribes, without affecting the others', () => {
    const clock = createPlayheadClock(0)
    const a = vi.fn()
    const b = vi.fn()
    const stopA = clock.subscribe(a)
    clock.subscribe(b)
    stopA()
    stopA() // harmless twice
    clock.set(1)
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('copes with a subscriber that unsubscribes itself while being told', () => {
    const clock = createPlayheadClock(0)
    const later = vi.fn()
    const stop = clock.subscribe(() => stop())
    clock.subscribe(later)
    expect(() => clock.set(1)).not.toThrow()
    expect(later).toHaveBeenCalledTimes(1)
  })
})
