// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProject } from '../model/project'

const load = vi.fn<(id: string) => Promise<unknown>>()
vi.mock('../persistence', () => ({ repository: { load: (id: string) => load(id), save: vi.fn() } }))

const { useProject } = await import('./projectStore')
const state = () => useProject.getState()

beforeEach(() => {
  load.mockReset()
  useProject.setState({ projectId: null, status: 'idle', error: null })
})

describe('loadProject', () => {
  it('goes loading -> ready and fills in the project', async () => {
    load.mockResolvedValue(createEmptyProject('Spring'))
    const pending = state().loadProject('a')
    expect(state().status).toBe('loading')
    await pending
    expect(state().status).toBe('ready')
    expect(state().projectId).toBe('a')
    expect(state().name).toBe('Spring')
    expect(state().saveState).toBe('saved')
  })

  it('reports a missing project', async () => {
    load.mockResolvedValue(null)
    await state().loadProject('missing')
    expect(state().status).toBe('error')
    expect(state().error).toMatch(/could not be found/)
  })

  it('reports a load failure with its message', async () => {
    load.mockRejectedValue(new Error('saved by a newer version'))
    await state().loadProject('a')
    expect(state().status).toBe('error')
    expect(state().error).toBe('saved by a newer version')
  })

  it('falls back to a generic message for non-Error failures', async () => {
    load.mockRejectedValue('boom')
    await state().loadProject('a')
    expect(state().error).toMatch(/could not be opened/)
  })

  it('ignores a slow load that was superseded by opening another project', async () => {
    let finishA!: (p: unknown) => void
    load.mockImplementationOnce(() => new Promise((r) => (finishA = r)))
    load.mockResolvedValueOnce(createEmptyProject('B'))

    const a = state().loadProject('a')
    await state().loadProject('b')
    finishA(createEmptyProject('A'))
    await a

    expect(state().projectId).toBe('b')
    expect(state().name).toBe('B')
  })

  it('ignores a superseded load that fails', async () => {
    let failA!: (e: Error) => void
    load.mockImplementationOnce(() => new Promise((_, rej) => (failA = rej)))
    load.mockResolvedValueOnce(createEmptyProject('B'))

    const a = state().loadProject('a')
    await state().loadProject('b')
    failA(new Error('late failure'))
    await a

    expect(state().status).toBe('ready')
    expect(state().error).toBeNull()
  })

  it('closeProject returns to idle', async () => {
    load.mockResolvedValue(createEmptyProject())
    await state().loadProject('a')
    state().closeProject()
    expect(state().projectId).toBeNull()
    expect(state().status).toBe('idle')
  })
})

describe('project settings', () => {
  it('renames, restages and retempos the project', () => {
    state().setProjectName('Renamed')
    state().setStage({ width: 50, depth: 30 })
    state().setTempo({ bpm: 90, startOffsetSec: 2 })
    expect(state().name).toBe('Renamed')
    expect(state().stage).toEqual({ width: 50, depth: 30 })
    expect(state().tempo).toEqual({ bpm: 90, startOffsetSec: 2 })
  })
})
