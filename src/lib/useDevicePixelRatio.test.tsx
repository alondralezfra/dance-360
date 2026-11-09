// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDevicePixelRatio } from './useDevicePixelRatio'

type Listener = () => void
let listeners: { query: string; fire: Listener; active: boolean }[]

beforeEach(() => {
  listeners = []
  vi.stubGlobal('devicePixelRatio', 1)
  vi.stubGlobal('matchMedia', (query: string) => {
    const entry = { query, fire: () => {}, active: false }
    listeners.push(entry)
    return {
      matches: true,
      media: query,
      addEventListener: (_: string, fn: Listener) => {
        entry.fire = fn
        entry.active = true
      },
      removeEventListener: () => {
        entry.active = false
      },
    }
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('useDevicePixelRatio', () => {
  it('starts at the current ratio', () => {
    vi.stubGlobal('devicePixelRatio', 1.5)
    const { result } = renderHook(() => useDevicePixelRatio())
    expect(result.current).toBe(1.5)
  })

  it('updates when the ratio changes (browser zoom) and keeps listening for the next change', () => {
    const { result } = renderHook(() => useDevicePixelRatio())
    expect(result.current).toBe(1)

    vi.stubGlobal('devicePixelRatio', 2)
    act(() => listeners.filter((l) => l.active).forEach((l) => l.fire()))
    expect(result.current).toBe(2)

    // Re-armed for the new ratio, so a second change is seen too.
    expect(listeners.at(-1)!.query).toBe('(resolution: 2dppx)')
    vi.stubGlobal('devicePixelRatio', 1.25)
    act(() => listeners.filter((l) => l.active).forEach((l) => l.fire()))
    expect(result.current).toBe(1.25)
  })

  it('also notices a change announced only by a window resize', () => {
    const { result } = renderHook(() => useDevicePixelRatio())
    vi.stubGlobal('devicePixelRatio', 1.75)
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current).toBe(1.75)
  })

  it('stops listening when unmounted', () => {
    const { unmount } = renderHook(() => useDevicePixelRatio())
    unmount()
    expect(listeners.some((l) => l.active)).toBe(false)
  })
})
