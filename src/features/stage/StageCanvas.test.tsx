// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { useImperativeHandle, useLayoutEffect, type ReactNode, type Ref } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProject } from '../../model/project'
import { useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'

// What counts here is how often React re-renders the dots, so the canvas pieces are
// replaced by plain stand-ins that count their renders and record where they are moved.
const dots = vi.hoisted(() => ({
  renders: 0,
  fills: new Map<string, string>(),
  nodes: new Map<string, { position: ReturnType<typeof vi.fn> }>(),
}))

vi.mock('react-konva', () => ({
  Stage: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Layer: ({ children, ref }: { children?: ReactNode; ref?: Ref<unknown> }) => {
    useImperativeHandle(ref, () => ({ batchDraw: () => {}, getLayers: () => [] }))
    return <div>{children}</div>
  },
}))
vi.mock('./StageFloor', () => ({ StageFloor: () => null }))
// The real theme reads CSS variables, which jsdom doesn't have. Fixed, recognisable colours instead.
vi.mock('../../theme/useCanvasTheme', () => {
  const theme = {
    unassigned: 'gray-fill',
    dotText: 'white-text',
    parts: { blue: 'blue-fill', red: 'red-fill' },
  }
  return { useCanvasTheme: () => theme }
})
vi.mock('./DancerDot', async () => {
  const { memo } = await import('react')
  return {
    DancerDot: memo(function DancerDot(props: {
      dancer: { id: string }
      fill: string
      onNode: (id: string, node: unknown) => void
    }) {
      dots.renders++
      dots.fills.set(props.dancer.id, props.fill)
      const { onNode } = props
      const id = props.dancer.id
      useLayoutEffect(() => {
        const node = dots.nodes.get(id) ?? { position: vi.fn() }
        dots.nodes.set(id, node)
        onNode(id, node)
        return () => onNode(id, null)
      }, [id, onNode])
      return null
    }),
  }
})

const { StageCanvas } = await import('./StageCanvas')

beforeEach(() => {
  dots.renders = 0
  dots.fills.clear()
  dots.nodes.clear()
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal(
    'ResizeObserver',
    class {
      cb: (e: unknown[]) => void
      constructor(cb: (e: unknown[]) => void) {
        this.cb = cb
      }
      observe() {
        this.cb([{ contentRect: { width: 900, height: 560 } }])
      }
      disconnect() {}
    },
  )
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

/** A project with `n` dancers and two formations a glide apart; the second starts a new section. */
function open(n: number) {
  const project = createEmptyProject()
  const dancers = Array.from({ length: n }, (_, i) => ({ id: `d${i}`, name: `D${i}` }))
  const at = (shift: number) => Object.fromEntries(dancers.map((d, i) => [d.id, { x: 5 + i + shift, y: 8 }]))
  const [part] = project.parts
  const second = { id: 'part-2', name: 'B', color: 'red' as const, sectionIds: ['s2'] }
  useProject.setState({
    ...project,
    dancers,
    parts: [{ ...part, sectionIds: ['s1'] }, second],
    sections: [
      { id: 's1', name: 'Verse', startCount: 0 },
      { id: 's2', name: 'Chorus', startCount: 14 },
    ],
    assignments: {},
    formations: [
      { id: 'f1', name: 'One', count: 0, transitionCounts: 4, positions: at(0) },
      { id: 'f2', name: 'Two', count: 16, transitionCounts: 4, positions: at(10) },
    ],
    status: 'ready',
    projectId: 'test',
  })
  useUi.getState().reset()
  useUi.getState().selectFormation('f1')
}

const frames = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

describe('StageCanvas performance shape', () => {
  it('does not re-render the dots on every animation frame of a glide, but still moves them', () => {
    open(40)
    render(<StageCanvas />)
    const nodes = [...dots.nodes.values()]
    expect(nodes).toHaveLength(40)

    // Step to the next formation: one re-render for the new resting positions...
    act(() => useUi.getState().selectFormation('f2'))
    const rendersAfterSelect = dots.renders
    nodes.forEach((n) => n.position.mockClear())

    // ...then ~40 animation frames of glide, during which React renders nothing more
    // (apart from the colour change when the glide crosses into the next section).
    frames(800)
    const extraRenders = dots.renders - rendersAfterSelect
    expect(extraRenders).toBeLessThanOrEqual(40) // at most one pass for the section colour change
    expect(nodes[0].position.mock.calls.length).toBeGreaterThan(10) // the dots really moved, frame by frame
  })

  it('moves dots through the pure playback function: ends exactly on the formation', () => {
    open(3)
    render(<StageCanvas />)
    act(() => useUi.getState().selectFormation('f2'))
    frames(1000)
    const last = dots.nodes.get('d0')!.position.mock.calls.at(-1)![0] as { x: number; y: number }
    const first = dots.nodes.get('d0')!.position.mock.calls[0][0] as { x: number; y: number }
    expect(last.x).toBeGreaterThan(first.x) // travelled toward the second formation (5 -> 15 ft)
  })

  it('does not re-render the dots at all for a glide within one section', () => {
    open(10)
    // Put both formations in the same section.
    useProject.setState({ sections: [{ id: 's1', name: 'Verse', startCount: 0 }] })
    render(<StageCanvas />)
    act(() => useUi.getState().selectFormation('f2'))
    const afterSelect = dots.renders
    frames(1000)
    expect(dots.renders).toBe(afterSelect)
  })

  it('re-renders the dots in the new colours when the glide crosses into another section', () => {
    open(2)
    // Verse has only the blue part, Chorus only the red one, so everyone changes colour at count 14.
    render(<StageCanvas />)
    expect(dots.fills.get('d0')).toBe('blue-fill')

    act(() => useUi.getState().selectFormation('f2'))
    const afterSelect = dots.renders
    frames(1000)
    expect(dots.fills.get('d0')).toBe('red-fill')
    expect(dots.fills.get('d1')).toBe('red-fill')
    // One pass for the colour change, not one per frame.
    expect(dots.renders - afterSelect).toBeLessThanOrEqual(2)
  })

  it('shows the colours of the section the playhead is in when stepping back', () => {
    open(2)
    useUi.getState().selectFormation('f2')
    render(<StageCanvas />)
    expect(dots.fills.get('d0')).toBe('red-fill')
    act(() => useUi.getState().selectFormation('f1'))
    frames(1000)
    expect(dots.fills.get('d0')).toBe('blue-fill')
  })

  it('renders nothing but the empty-state message when there are no dancers', () => {
    open(0)
    const { container } = render(<StageCanvas />)
    expect(container.textContent).toContain('Add dancers')
    expect(dots.renders).toBe(0)
  })
})
