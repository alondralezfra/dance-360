// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProject } from '../model/project'

const save = vi.fn<(id: string, project: unknown) => Promise<void>>()
vi.mock('../persistence', () => ({
  repository: { save: (id: string, project: unknown) => save(id, project), load: vi.fn() },
}))

const { useProject } = await import('./projectStore')
const { startAutosave } = await import('./autosave')

let stop: () => void

const open = (id: string) =>
  useProject.setState({ ...createEmptyProject(`Project ${id}`), projectId: id, status: 'ready', saveState: 'saved' })
const state = () => useProject.getState()

beforeEach(() => {
  vi.useFakeTimers()
  save.mockReset()
  save.mockResolvedValue(undefined)
  useProject.setState({ projectId: null, status: 'idle' })
  stop = startAutosave()
})
afterEach(() => {
  stop()
  vi.useRealTimers()
})

describe('autosave', () => {
  it('saves shortly after an edit, then reports saved', async () => {
    open('p1')
    state().addDancer('Maya')
    expect(state().saveState).toBe('dirty')
    expect(save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(400)
    expect(save).toHaveBeenCalledTimes(1)
    const [id, project] = save.mock.calls[0] as [string, { dancers: { name: string }[] }]
    expect(id).toBe('p1')
    expect(project.dancers.map((d) => d.name)).toEqual(['Maya'])
    expect(state().saveState).toBe('saved')
  })

  it('batches a burst of edits into one save of the latest data', async () => {
    open('p1')
    state().addDancer('A')
    await vi.advanceTimersByTimeAsync(200)
    state().addDancer('B')
    await vi.advanceTimersByTimeAsync(200)
    state().addDancer('C')
    await vi.advanceTimersByTimeAsync(400)

    expect(save).toHaveBeenCalledTimes(1)
    const project = save.mock.calls[0][1] as { dancers: unknown[] }
    expect(project.dancers).toHaveLength(3)
  })

  it.each([
    ['a part is added', () => state().addPart()],
    ['a section is added', () => state().addSection()],
    ['someone is assigned to a part', () => {
      state().addDancer('Maya')
      state().assignDancer(state().sections[0].id, state().dancers[0].id, state().parts[0].id)
    }],
  ])('saves when %s', async (_name, change) => {
    open('p1')
    change()
    await vi.advanceTimersByTimeAsync(400)
    expect(save).toHaveBeenCalledTimes(1)
    const project = save.mock.calls[0][1] as { parts: unknown[]; sections: unknown[]; assignments: object }
    expect(project).toHaveProperty('parts')
    expect(project).toHaveProperty('sections')
    expect(project).toHaveProperty('assignments')
  })

  it('does not save just because a project finished loading', async () => {
    open('p1')
    await vi.advanceTimersByTimeAsync(1000)
    expect(save).not.toHaveBeenCalled()
  })

  it('does not save changes to UI-only state', async () => {
    open('p1')
    useProject.setState({ saveState: 'saved' })
    await vi.advanceTimersByTimeAsync(1000)
    expect(save).not.toHaveBeenCalled()
  })

  it('does not save while a project is loading', async () => {
    useProject.setState({ projectId: 'p1', status: 'loading' })
    state().addDancer('A')
    await vi.advanceTimersByTimeAsync(1000)
    expect(save).not.toHaveBeenCalled()
  })

  it('saves pending edits immediately when another project is opened', async () => {
    open('p1')
    state().addDancer('Maya')
    useProject.setState({ projectId: 'p2', status: 'loading' })
    await vi.advanceTimersByTimeAsync(0)

    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][0]).toBe('p1')
  })

  it('saves pending edits when the page is hidden', async () => {
    open('p1')
    state().addDancer('Maya')
    window.dispatchEvent(new Event('pagehide'))
    await vi.advanceTimersByTimeAsync(0)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('reports an error when saving fails, and recovers on the next success', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    save.mockRejectedValueOnce(new Error('quota exceeded'))
    open('p1')
    state().addDancer('A')
    await vi.advanceTimersByTimeAsync(400)
    expect(state().saveState).toBe('error')

    state().addDancer('B')
    await vi.advanceTimersByTimeAsync(400)
    expect(state().saveState).toBe('saved')
  })
})
