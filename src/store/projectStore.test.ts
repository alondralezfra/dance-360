import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../model/project'
import { useProject } from './projectStore'

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
})

const state = () => useProject.getState()

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
