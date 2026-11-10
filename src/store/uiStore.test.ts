import { beforeEach, describe, expect, it } from 'vitest'
import { useUi } from './uiStore'

beforeEach(() => useUi.getState().reset())

describe('uiStore', () => {
  it('starts with nothing selected, and the selection counted as the person\'s own', () => {
    expect(useUi.getState()).toMatchObject({ selectedDancerId: null, currentFormationId: null, selectionSource: 'user' })
  })

  it('selects a dancer and a formation', () => {
    useUi.getState().selectDancer('d1')
    useUi.getState().selectFormation('f1')
    expect(useUi.getState()).toMatchObject({ selectedDancerId: 'd1', currentFormationId: 'f1' })
  })

  it('remembers who chose the formation: the person, unless the playhead did', () => {
    useUi.getState().selectFormation('f1')
    expect(useUi.getState().selectionSource).toBe('user')
    useUi.getState().selectFormation('f2', 'playhead')
    expect(useUi.getState()).toMatchObject({ currentFormationId: 'f2', selectionSource: 'playhead' })
    useUi.getState().selectFormation('f3')
    expect(useUi.getState().selectionSource).toBe('user')
  })

  it('reset clears everything, including who chose', () => {
    useUi.getState().selectDancer('d1')
    useUi.getState().selectFormation('f2', 'playhead')
    useUi.getState().reset()
    expect(useUi.getState()).toMatchObject({ selectedDancerId: null, currentFormationId: null, selectionSource: 'user' })
  })
})
