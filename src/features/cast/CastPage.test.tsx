// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_PARTS } from '../../model/parts'
import { createEmptyProject } from '../../model/project'
import { useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'
import { CastPage } from './CastPage'

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
  useUi.getState().reset()
})
afterEach(() => vi.restoreAllMocks())

const s = () => useProject.getState()
const renderPage = () =>
  render(
    <MemoryRouter>
      <CastPage />
    </MemoryRouter>,
  )

describe('Parts', () => {
  it('lists the project’s parts', () => {
    renderPage()
    expect(screen.getByLabelText('Name of part 1')).toHaveValue('Part A')
    expect(screen.getByLabelText('Colour of part 1')).toHaveValue('blue')
  })

  it('adds a part with the next letter and a different colour', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: '+ Add part' }))
    expect(screen.getByLabelText('Name of part 2')).toHaveValue('Part B')
    expect(screen.getByLabelText('Colour of part 2')).not.toHaveValue('blue')
  })

  it('renames and recolours a part', async () => {
    const user = userEvent.setup()
    renderPage()
    const name = screen.getByLabelText('Name of part 1')
    await user.clear(name)
    await user.type(name, 'Floor')
    await user.selectOptions(screen.getByLabelText('Colour of part 1'), 'green')
    expect(s().parts[0]).toMatchObject({ name: 'Floor', color: 'green' })
  })

  it('disables adding at the maximum and says why', () => {
    for (let i = 0; i < MAX_PARTS; i++) s().addPart()
    renderPage()
    expect(screen.getByRole('button', { name: '+ Add part' })).toBeDisabled()
    expect(screen.getByText(`${MAX_PARTS} parts is the maximum.`)).toBeInTheDocument()
  })

  it('removes an unused part without asking', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Remove Part A' }))
    expect(confirm).not.toHaveBeenCalled()
    expect(s().parts).toEqual([])
    expect(screen.getByText(/No parts yet/)).toBeInTheDocument()
  })

  it('asks before removing a part that people are assigned to, and respects "cancel"', async () => {
    s().addDancer('Maya')
    s().assignDancer(s().sections[0].id, s().dancers[0].id, s().parts[0].id)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Remove Part A' }))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('1 assignment will be cleared'))
    expect(s().parts).toHaveLength(1)

    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Remove Part A' }))
    expect(s().parts).toHaveLength(0)
  })

  it('pluralises the number of assignments that would be cleared', async () => {
    s().addDancer('Maya')
    s().addDancer('Jordan')
    for (const d of s().dancers) s().assignDancer(s().sections[0].id, d.id, s().parts[0].id)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Remove Part A' }))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('2 assignments will be cleared'))
  })
})

describe('Sections', () => {
  it('shows the first section as fixed at the start of the dance', () => {
    renderPage()
    expect(screen.getByLabelText('Name of section 1')).toHaveValue('Section 1')
    expect(screen.getByText('Starts at Set 1 · Count 1')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Start of section 1' })).not.toBeInTheDocument()
  })

  it('removing is disabled while there is only one section', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Remove Section 1' })).toBeDisabled()
  })

  it('adds a section two sets later and lets you edit its name and start', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: '+ Add section' }))

    const start = screen.getByRole('group', { name: 'Start of section 2' })
    expect(within(start).getByLabelText('Set')).toHaveValue('3')
    expect(within(start).getByLabelText('Count')).toHaveValue('1')

    const name = screen.getByLabelText('Name of section 2')
    await user.clear(name)
    await user.type(name, 'Chorus')
    await user.clear(within(start).getByLabelText('Set'))
    await user.type(within(start).getByLabelText('Set'), '5{Enter}')
    await user.clear(within(start).getByLabelText('Count'))
    await user.type(within(start).getByLabelText('Count'), '3{Enter}')

    expect(s().sections[1]).toMatchObject({ name: 'Chorus', startCount: 4 * 8 + 2 })
  })

  it('removes a section', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: '+ Add section' }))
    await user.click(screen.getByRole('button', { name: 'Remove Section 2' }))
    expect(s().sections).toHaveLength(1)
  })
})

describe('Assignments', () => {
  it('invites you to add dancers when there are none', () => {
    renderPage()
    expect(screen.getByText(/No dancers yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add dancers on the Stage tab' })).toBeInTheDocument()
  })

  it('shows a row per dancer and a column per section, with where each section starts', async () => {
    s().addDancer('Maya')
    s().addDancer('Jordan')
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: '+ Add section' }))

    const grid = screen.getByRole('table')
    expect(within(grid).getByRole('rowheader', { name: 'Maya' })).toBeInTheDocument()
    expect(within(grid).getByRole('rowheader', { name: 'Jordan' })).toBeInTheDocument()
    expect(within(grid).getByRole('columnheader', { name: /Section 1.*Set 1 · Count 1/ })).toBeInTheDocument()
    expect(within(grid).getByRole('columnheader', { name: /Section 2.*Set 3 · Count 1/ })).toBeInTheDocument()
  })

  it('flags unassigned cells, listing who is missing where', () => {
    s().addDancer('Maya')
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('1 missing assignment')
    expect(screen.getByText('Maya has no part in Section 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Maya, Section 1')).toBeInvalid()
  })

  it('assigning a part saves it and clears the warning', async () => {
    s().addDancer('Maya')
    const user = userEvent.setup()
    renderPage()
    await user.selectOptions(screen.getByLabelText('Maya, Section 1'), 'Part A')

    expect(s().assignments[s().sections[0].id][s().dancers[0].id]).toBe(s().parts[0].id)
    expect(screen.getByRole('status')).toHaveTextContent('Everyone has a part in every section.')
    expect(screen.queryByText(/has no part in/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Maya, Section 1')).toBeValid()
  })

  it('choosing "No part" clears an assignment and the warning returns', async () => {
    s().addDancer('Maya')
    s().assignDancer(s().sections[0].id, s().dancers[0].id, s().parts[0].id)
    const user = userEvent.setup()
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Everyone has a part')
    await user.selectOptions(screen.getByLabelText('Maya, Section 1'), 'No part')
    expect(screen.getByRole('status')).toHaveTextContent('1 missing assignment')
  })

  it('offers every part in each cell, and a dancer can be in different parts in different sections', async () => {
    s().addDancer('Maya')
    s().addPart()
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: '+ Add section' }))

    const cell1 = screen.getByLabelText('Maya, Section 1')
    expect(within(cell1).getAllByRole('option').map((o) => o.textContent)).toEqual(['No part', 'Part A', 'Part B'])
    await user.selectOptions(cell1, 'Part A')
    await user.selectOptions(screen.getByLabelText('Maya, Section 2'), 'Part B')

    const [sec1, sec2] = s().sections
    const [a, b] = s().parts
    expect(s().assignments[sec1.id][s().dancers[0].id]).toBe(a.id)
    expect(s().assignments[sec2.id][s().dancers[0].id]).toBe(b.id)
  })

  it('pluralises the missing count', () => {
    s().addDancer('Maya')
    s().addDancer('Jordan')
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('2 missing assignments')
  })

  it('shows a removed part’s cells as missing again', async () => {
    s().addDancer('Maya')
    s().assignDancer(s().sections[0].id, s().dancers[0].id, s().parts[0].id)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Remove Part A' }))
    expect(confirm).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('1 missing assignment')
  })
})
