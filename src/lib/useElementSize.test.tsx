// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useElementSize } from './useElementSize'

type Callback = (entries: { contentRect: { width: number; height: number } }[]) => void
let callback: Callback
const disconnect = vi.fn()

beforeEach(() => {
  disconnect.mockClear()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: Callback) {
        callback = cb
      }
      observe() {}
      disconnect = disconnect
    },
  )
})
afterEach(() => vi.unstubAllGlobals())

function Probe() {
  const [ref, size] = useElementSize<HTMLDivElement>()
  return (
    <div ref={ref} data-testid="box">
      {size.width}x{size.height}
    </div>
  )
}

describe('useElementSize', () => {
  it('starts at 0x0 and follows the element as it is resized', () => {
    render(<Probe />)
    expect(screen.getByTestId('box')).toHaveTextContent('0x0')
    act(() => callback([{ contentRect: { width: 320, height: 180 } }]))
    expect(screen.getByTestId('box')).toHaveTextContent('320x180')
    act(() => callback([{ contentRect: { width: 100, height: 50 } }]))
    expect(screen.getByTestId('box')).toHaveTextContent('100x50')
  })

  it('stops observing when unmounted', () => {
    const { unmount } = render(<Probe />)
    unmount()
    expect(disconnect).toHaveBeenCalled()
  })
})
