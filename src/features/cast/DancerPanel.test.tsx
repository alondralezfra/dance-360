// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../../model/project'
import { useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'
import { DancerPanel } from './DancerPanel'

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
  useUi.getState().reset()
})

const names = () => useProject.getState().dancers.map((d) => d.name)

describe('DancerPanel', () => {
  it('starts empty with the Add button disabled', () => {
    render(<DancerPanel />)
    expect(screen.getByText('Dancers (0)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('adds a dancer from the form and clears the input', async () => {
    const user = userEvent.setup()
    render(<DancerPanel />)
    await user.type(screen.getByPlaceholderText('Dancer name'), 'Maya Lopez{Enter}')
    expect(names()).toEqual(['Maya Lopez'])
    expect(screen.getByPlaceholderText('Dancer name')).toHaveValue('')
    expect(screen.getByText('Dancers (1)')).toBeInTheDocument()
  })

  it('ignores a whitespace-only name', async () => {
    const user = userEvent.setup()
    render(<DancerPanel />)
    await user.type(screen.getByPlaceholderText('Dancer name'), '   ')
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    await user.keyboard('{Enter}')
    expect(names()).toEqual([])
  })

  it('renames a dancer inline', async () => {
    useProject.getState().addDancer('Maya')
    const user = userEvent.setup()
    render(<DancerPanel />)
    const field = screen.getByLabelText('Dancer name')
    await user.clear(field)
    await user.type(field, 'Maya L')
    expect(names()).toEqual(['Maya L'])
  })

  it('selects a dancer on click and deselects on a second click', async () => {
    useProject.getState().addDancer('Maya')
    const id = useProject.getState().dancers[0].id
    const user = userEvent.setup()
    render(<DancerPanel />)

    await user.click(screen.getByRole('listitem'))
    expect(useUi.getState().selectedDancerId).toBe(id)
    await user.click(screen.getByRole('listitem'))
    expect(useUi.getState().selectedDancerId).toBeNull()
  })

  it('shows each dancer’s part colour at the current formation, or "No part"', () => {
    useProject.getState().addDancer('Maya')
    useProject.getState().addDancer('Jordan')
    const [maya] = useProject.getState().dancers
    const { sections, parts } = useProject.getState()
    useProject.getState().assignDancer(sections[0].id, maya.id, parts[0].id)

    render(<DancerPanel />)
    const dots = screen.getAllByRole('img')
    expect(dots[0]).toHaveAccessibleName('Part A')
    expect(dots[0]).toHaveStyle({ backgroundColor: 'var(--part-blue)' })
    expect(dots[1]).toHaveAccessibleName('No part')
  })

  it('removes a dancer and clears their selection', async () => {
    useProject.getState().addDancer('Maya')
    useProject.getState().addDancer('Jordan')
    const maya = useProject.getState().dancers[0]
    useUi.getState().selectDancer(maya.id)
    const user = userEvent.setup()
    render(<DancerPanel />)

    await user.click(screen.getByRole('button', { name: 'Remove Maya' }))
    expect(names()).toEqual(['Jordan'])
    expect(useUi.getState().selectedDancerId).toBeNull()
  })

  it('removing another dancer keeps the current selection', async () => {
    useProject.getState().addDancer('Maya')
    useProject.getState().addDancer('Jordan')
    const [maya] = useProject.getState().dancers
    useUi.getState().selectDancer(maya.id)
    const user = userEvent.setup()
    render(<DancerPanel />)

    await user.click(screen.getByRole('button', { name: 'Remove Jordan' }))
    expect(useUi.getState().selectedDancerId).toBe(maya.id)
  })
})
