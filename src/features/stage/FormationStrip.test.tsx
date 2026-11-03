// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../../model/project'
import { useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'
import { FormationStrip } from './FormationStrip'

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
  useUi.getState().reset()
})

const formations = () => useProject.getState().formations

describe('FormationStrip', () => {
  it('shows the first formation when nothing is selected yet', () => {
    render(<FormationStrip />)
    expect(screen.getByLabelText('Formation name')).toHaveValue('Formation 1')
    expect(screen.getByText('1 of 1')).toBeInTheDocument()
  })

  it('disables previous/next at the ends and delete when only one remains', () => {
    render(<FormationStrip />)
    expect(screen.getByRole('button', { name: 'Previous formation' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next formation' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })

  it('adds a formation one set later and selects it', async () => {
    const user = userEvent.setup()
    render(<FormationStrip />)
    await user.click(screen.getByRole('button', { name: '+ New formation' }))

    expect(formations()).toHaveLength(2)
    expect(formations()[1].count).toBe(8)
    expect(useUi.getState().currentFormationId).toBe(formations()[1].id)
    expect(screen.getByText('2 of 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Set')).toHaveValue('2')
    expect(screen.getByLabelText('Count')).toHaveValue('1')
  })

  it('steps between formations', async () => {
    const user = userEvent.setup()
    render(<FormationStrip />)
    await user.click(screen.getByRole('button', { name: '+ New formation' }))
    await user.click(screen.getByRole('button', { name: 'Previous formation' }))
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next formation' }))
    expect(screen.getByText('2 of 2')).toBeInTheDocument()
  })

  it('jumps to a formation from the list', async () => {
    const user = userEvent.setup()
    render(<FormationStrip />)
    await user.click(screen.getByRole('button', { name: '+ New formation' }))
    await user.click(screen.getByRole('button', { name: /^1\.\s*Formation 1$/ }))
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
  })

  it('renames the current formation', async () => {
    const user = userEvent.setup()
    render(<FormationStrip />)
    const name = screen.getByLabelText('Formation name')
    await user.clear(name)
    await user.type(name, 'Opening')
    expect(formations()[0].name).toBe('Opening')
  })

  it('deleting a formation selects its neighbour', async () => {
    const user = userEvent.setup()
    render(<FormationStrip />)
    await user.click(screen.getByRole('button', { name: '+ New formation' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(formations()).toHaveLength(1)
    expect(screen.getByText('1 of 1')).toBeInTheDocument()
  })

  it('deleting the first formation selects the next one', async () => {
    const user = userEvent.setup()
    render(<FormationStrip />)
    await user.click(screen.getByRole('button', { name: '+ New formation' }))
    await user.click(screen.getByRole('button', { name: 'Previous formation' }))
    const second = formations()[1]
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(useUi.getState().currentFormationId).toBe(second.id)
  })

  it('retimes the formation from the Set and Count fields', async () => {
    const user = userEvent.setup()
    render(<FormationStrip />)

    const set = screen.getByLabelText('Set')
    await user.clear(set)
    await user.type(set, '3{Enter}')
    expect(formations()[0].count).toBe(16)

    const count = screen.getByLabelText('Count')
    await user.clear(count)
    await user.type(count, '5{Enter}')
    expect(formations()[0].count).toBe(20) // Set 3, Count 5
  })

  it('changes how many counts the dancers take to travel', async () => {
    const user = userEvent.setup()
    render(<FormationStrip />)
    const travel = screen.getByLabelText('Travel counts')
    await user.clear(travel)
    await user.type(travel, '2{Enter}')
    expect(formations()[0].transitionCounts).toBe(2)
  })

  it('keeps the formation list in order when a formation is retimed past another', async () => {
    const user = userEvent.setup()
    render(<FormationStrip />)
    await user.click(screen.getByRole('button', { name: '+ New formation' }))
    await user.click(screen.getByRole('button', { name: 'Previous formation' }))
    const set = screen.getByLabelText('Set')
    await user.clear(set)
    await user.type(set, '9{Enter}')
    expect(formations().map((f) => f.name)).toEqual(['Formation 2', 'Formation 1'])
  })
})
