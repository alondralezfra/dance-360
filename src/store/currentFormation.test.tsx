// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../model/project'
import { useCurrentFormation, useProject } from './projectStore'
import { useUi } from './uiStore'

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
  useUi.getState().reset()
})

describe('useCurrentFormation', () => {
  it('returns the first formation when nothing is selected', () => {
    const { result } = renderHook(() => useCurrentFormation())
    expect(result.current.id).toBe(useProject.getState().formations[0].id)
  })

  it('returns the selected formation', () => {
    const second = useProject.getState().addFormation(useProject.getState().formations[0].id)
    useUi.getState().selectFormation(second)
    const { result } = renderHook(() => useCurrentFormation())
    expect(result.current.id).toBe(second)
  })

  it('falls back to the first formation when the selection is stale (e.g. deleted)', () => {
    useUi.getState().selectFormation('does-not-exist')
    const { result } = renderHook(() => useCurrentFormation())
    expect(result.current.id).toBe(useProject.getState().formations[0].id)
  })

  it('updates when the selection changes', () => {
    const first = useProject.getState().formations[0]
    const second = useProject.getState().addFormation(first.id)
    const { result } = renderHook(() => useCurrentFormation())
    expect(result.current.id).toBe(first.id)
    act(() => useUi.getState().selectFormation(second))
    expect(result.current.id).toBe(second)
  })
})

describe('uiStore', () => {
  it('reset clears selections', () => {
    useUi.getState().selectDancer('d')
    useUi.getState().selectFormation('f')
    useUi.getState().reset()
    expect(useUi.getState().selectedDancerId).toBeNull()
    expect(useUi.getState().currentFormationId).toBeNull()
  })
})
