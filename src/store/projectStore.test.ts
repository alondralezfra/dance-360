import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../model/project'
import { useProject } from './projectStore'

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
})

const state = () => useProject.getState()

describe('edge cases', () => {
  it('names a dancer "New dancer" when given blank text', () => {
    state().addDancer('   ')
    expect(state().dancers[0].name).toBe('New dancer')
  })

  it('trims dancer names', () => {
    state().addDancer('  Maya  ')
    expect(state().dancers[0].name).toBe('Maya')
  })

  it('adds a formation after the last one when the given id no longer exists', () => {
    const first = state().formations[0]
    const id = state().addFormation('deleted-id')
    expect(state().formations.find((f) => f.id === id)!.count).toBe(first.count + 8)
  })

  it('can add a formation to a project that has none', () => {
    useProject.setState({ formations: [] })
    const id = state().addFormation('anything')
    const added = state().formations.find((f) => f.id === id)!
    expect(added.count).toBe(8)
    expect(added.transitionCounts).toBe(4)
    expect(added.positions).toEqual({})
  })

  it('rounds travel counts and never lets them go negative', () => {
    const id = state().formations[0].id
    state().setFormationTransition(id, 2.6)
    expect(state().formations[0].transitionCounts).toBe(3)
    state().setFormationTransition(id, -5)
    expect(state().formations[0].transitionCounts).toBe(0)
  })

  it('renames a formation without touching the others', () => {
    const a = state().formations[0].id
    const b = state().addFormation(a)
    state().renameFormation(b, 'Finale')
    expect(state().formations.map((f) => f.name)).toEqual(['Formation 1', 'Finale'])
  })

  it('moving a dancer only changes the formation asked for', () => {
    state().addDancer('Maya')
    const a = state().formations[0]
    const b = state().addFormation(a.id)
    const dancer = state().dancers[0].id
    state().moveDancer(b, dancer, { x: 5, y: 5 })
    expect(state().formations[0].positions[dancer]).toEqual(a.positions[dancer])
    expect(state().formations[1].positions[dancer]).toEqual({ x: 5, y: 5 })
  })

  it('removes a formation by id and leaves the rest in order', () => {
    const a = state().formations[0].id
    const b = state().addFormation(a)
    const c = state().addFormation(b)
    state().removeFormation(b)
    expect(state().formations.map((f) => f.id)).toEqual([a, c])
  })
})

describe('roster', () => {
  it('gives a new dancer a position in every formation', () => {
    state().addFormation(state().formations[0].id)
    state().addDancer('Maya')
    const [dancer] = state().dancers
    expect(state().formations).toHaveLength(2)
    for (const f of state().formations) expect(f.positions[dancer.id]).toBeDefined()
  })

  it('removes a dancer from every formation', () => {
    state().addDancer('Maya')
    const id = state().dancers[0].id
    state().removeDancer(id)
    expect(state().dancers).toHaveLength(0)
    expect(state().formations[0].positions[id]).toBeUndefined()
  })
})

describe('formations', () => {
  it('adds a copy of the previous formation one set later', () => {
    state().addDancer('Maya')
    const first = state().formations[0]
    const newId = state().addFormation(first.id)
    const added = state().formations.find((f) => f.id === newId)!
    expect(added.count).toBe(first.count + 8)
    expect(added.positions).toEqual(first.positions)
  })

  it('keeps formations ordered when a count is changed', () => {
    const a = state().formations[0].id
    const b = state().addFormation(a)
    state().setFormationCount(a, 40) // move the first one past the second
    expect(state().formations.map((f) => f.id)).toEqual([b, a])
  })

  it('never lets two formations share a count', () => {
    const a = state().formations[0].id
    const b = state().addFormation(a)
    state().setFormationCount(b, 0)
    const counts = state().formations.map((f) => f.count)
    expect(new Set(counts).size).toBe(counts.length)
  })

  it('always keeps at least one formation', () => {
    state().removeFormation(state().formations[0].id)
    expect(state().formations).toHaveLength(1)
  })

  it('keeps moved dancers inside the stage', () => {
    state().addDancer('Maya')
    const f = state().formations[0]
    state().moveDancer(f.id, state().dancers[0].id, { x: -50, y: 999 })
    const p = state().formations[0].positions[state().dancers[0].id]
    expect(p).toEqual({ x: 0, y: state().stage.depth })
  })
})
