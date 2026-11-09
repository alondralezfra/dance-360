// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COALESCE_MS, MAX_HISTORY } from '../model/history'
import { createEmptyProject } from '../model/project'

const save = vi.fn<(id: string, project: unknown) => Promise<void>>()
vi.mock('../persistence', () => ({
  repository: { save: (id: string, project: unknown) => save(id, project), load: vi.fn() },
}))

const { useProject } = await import('./projectStore')
const { startHistory } = await import('./history')
const { startAutosave } = await import('./autosave')

const state = () => useProject.getState()
const open = (id: string) =>
  useProject.setState({ ...createEmptyProject(`Project ${id}`), projectId: id, status: 'ready', saveState: 'saved' })

let stopHistory: () => void
let stopAutosave: () => void

beforeEach(() => {
  vi.useFakeTimers()
  save.mockReset()
  save.mockResolvedValue(undefined)
  useProject.setState({ projectId: null, status: 'idle' })
  stopHistory = startHistory()
  stopAutosave = startAutosave()
  open('p1')
})
afterEach(() => {
  stopAutosave()
  stopHistory()
  vi.useRealTimers()
})

describe('undo and redo', () => {
  it('has nothing to undo in a freshly opened project', () => {
    expect(state().history.past).toHaveLength(0)
    state().undo()
    state().redo()
    expect(state().dancers).toEqual([])
  })

  it('undoes and redoes adding a dancer', () => {
    state().addDancer('Maya')
    expect(state().dancers).toHaveLength(1)
    state().undo()
    expect(state().dancers).toHaveLength(0)
    state().redo()
    expect(state().dancers.map((d) => d.name)).toEqual(['Maya'])
  })

  it('undoes edits in the order they were made, across different parts of the project', () => {
    state().addDancer('Maya')
    const formationId = state().formations[0].id
    state().renameFormation(formationId, 'Opening')
    vi.advanceTimersByTime(COALESCE_MS + 1)
    state().addPart()
    state().setStage({ width: 50, depth: 30 })

    state().undo()
    expect(state().stage).toEqual({ width: 40, depth: 24 })
    state().undo()
    expect(state().parts).toHaveLength(1)
    state().undo()
    expect(state().formations[0].name).toBe('Formation 1')
    state().undo()
    expect(state().dancers).toHaveLength(0)
  })

  it('undoes a dancer move and a deletion, including what the deletion cascaded to', () => {
    state().addDancer('Maya')
    const dancerId = state().dancers[0].id
    const partId = state().parts[0].id
    const sectionId = state().sections[0].id
    state().assignDancer(sectionId, dancerId, partId)

    state().removeDancer(dancerId)
    expect(state().dancers).toHaveLength(0)
    expect(state().formations[0].positions[dancerId]).toBeUndefined()

    state().undo()
    expect(state().dancers).toHaveLength(1)
    expect(state().formations[0].positions[dancerId]).toBeDefined()
    expect(state().assignments[sectionId]?.[dancerId]).toBe(partId)
  })

  it('a new edit after undo discards what could have been redone', () => {
    state().addDancer('A')
    state().addDancer('B')
    state().undo()
    state().addDancer('C')
    state().redo()
    expect(state().dancers.map((d) => d.name)).toEqual(['A', 'C'])
  })

  it('undoing an edit that reorders formations restores the old order and counts', () => {
    const first = state().formations[0].id
    const second = state().addFormation(first)
    const before = state().formations.map((f) => [f.id, f.count])
    state().reorderFormation(second, 0)
    expect(state().formations[0].id).toBe(second)
    state().undo()
    expect(state().formations.map((f) => [f.id, f.count])).toEqual(before)
  })
})

describe('typing in a name box', () => {
  it('is one undo step however many keystrokes', () => {
    state().addDancer('Maya')
    const id = state().dancers[0].id
    vi.advanceTimersByTime(COALESCE_MS + 1)
    for (const text of ['M', 'Ma', 'Maj', 'Maja']) {
      state().renameDancer(id, text)
      vi.advanceTimersByTime(100)
    }
    expect(state().dancers[0].name).toBe('Maja')
    state().undo()
    expect(state().dancers[0].name).toBe('Maya')
    state().undo()
    expect(state().dancers).toHaveLength(0)
  })

  it('a pause starts a new step, and different names never merge', () => {
    state().addDancer('A')
    state().addDancer('B')
    const [a, b] = state().dancers.map((d) => d.id)
    vi.advanceTimersByTime(COALESCE_MS + 1)
    state().renameDancer(a, 'A1')
    vi.advanceTimersByTime(COALESCE_MS + 1)
    state().renameDancer(a, 'A2')
    state().renameDancer(b, 'B1')

    state().undo()
    expect(state().dancers.map((d) => d.name)).toEqual(['A2', 'B'])
    state().undo()
    expect(state().dancers.map((d) => d.name)).toEqual(['A1', 'B'])
    state().undo()
    expect(state().dancers.map((d) => d.name)).toEqual(['A', 'B'])
  })
})

describe('limits and lifetime', () => {
  it('remembers only the last MAX_HISTORY steps', () => {
    for (let i = 0; i < MAX_HISTORY + 10; i++) state().addDancer(`D${i}`)
    expect(state().history.past).toHaveLength(MAX_HISTORY)
    for (let i = 0; i < MAX_HISTORY + 10; i++) state().undo()
    expect(state().dancers).toHaveLength(10) // the first ten adds can't be undone any more
  })

  it('starts clean when another project is opened, and when one is closed', () => {
    state().addDancer('Maya')
    expect(state().history.past).toHaveLength(1)
    open('p2')
    expect(state().history.past).toHaveLength(0)
    state().undo()
    expect(state().name).toBe('Project p2') // nothing from p1 leaked in

    state().addDancer('Jo')
    state().closeProject()
    expect(state().history.past).toHaveLength(0)
  })

  it('does not record the load of a project as an edit', () => {
    useProject.setState({ projectId: 'p3', status: 'loading' })
    useProject.setState({ ...createEmptyProject('Three'), status: 'ready' })
    expect(state().history.past).toHaveLength(0)
  })

  it('never puts history into the saved document', async () => {
    state().addDancer('Maya')
    await vi.advanceTimersByTimeAsync(400)
    const [, project] = save.mock.calls[0] as [string, Record<string, unknown>]
    expect(Object.keys(project)).not.toContain('history')
  })
})

describe('with autosave', () => {
  it('saves the result of an undo, so a reload shows what you see', async () => {
    state().addDancer('Maya')
    await vi.advanceTimersByTimeAsync(400)
    state().undo()
    expect(state().saveState).toBe('dirty')
    await vi.advanceTimersByTimeAsync(400)

    const last = save.mock.calls.at(-1) as [string, { dancers: unknown[] }]
    expect(last[1].dancers).toHaveLength(0)
    expect(state().saveState).toBe('saved')
  })
})
