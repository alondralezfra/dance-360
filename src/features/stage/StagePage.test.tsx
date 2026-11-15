// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProject } from '../../model/project'
import { useLayout } from '../../store/layoutStore'
import { useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'
import { StagePage } from './StagePage'

// The canvas needs a real browser; its sizing is covered by stageLayout.test.ts and the e2e tests.
vi.mock('./StageCanvas', () => ({ StageCanvas: () => <div data-testid="stage" /> }))

beforeEach(() => {
  localStorage.clear()
  useLayout.setState({ sidebarOpen: true, notesOpen: false, formationBarOpen: true })
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
  useUi.getState().reset()
})

const saved = () => JSON.parse(localStorage.getItem('dance360:device-preferences') ?? '{}')

describe('collapsible panels', () => {
  it('hides and shows the dancer sidebar, and its contents leave the tab order while hidden', async () => {
    const user = userEvent.setup()
    render(<StagePage />, { wrapper: MemoryRouter })
    const toggle = screen.getByRole('button', { name: 'Hide dancer panel' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Show dancer panel' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByPlaceholderText('Dancer name').closest('aside')).toHaveAttribute('inert')

    await user.click(screen.getByRole('button', { name: 'Show dancer panel' }))
    expect(screen.getByPlaceholderText('Dancer name').closest('aside')).not.toHaveAttribute('inert')
  })

  it('hides and shows the formation bar', async () => {
    const user = userEvent.setup()
    render(<StagePage />, { wrapper: MemoryRouter })
    const footer = () => screen.getByLabelText('Formation name').closest('footer')!
    expect(footer()).not.toHaveAttribute('inert')

    await user.click(screen.getByRole('button', { name: 'Hide formation bar' }))
    expect(footer()).toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: 'Show formation bar' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show formation bar' }))
    expect(footer()).not.toHaveAttribute('inert')
  })

  it('remembers the choice on this device', async () => {
    const user = userEvent.setup()
    render(<StagePage />, { wrapper: MemoryRouter })
    await user.click(screen.getByRole('button', { name: 'Hide dancer panel' }))
    await user.click(screen.getByRole('button', { name: 'Hide formation bar' }))
    expect(saved()).toEqual({ sidebarOpen: false, notesOpen: false, formationBarOpen: false })
  })

  it('does not put the panel state in the project', async () => {
    const user = userEvent.setup()
    render(<StagePage />, { wrapper: MemoryRouter })
    await user.click(screen.getByRole('button', { name: 'Hide dancer panel' }))
    expect(JSON.stringify(useProject.getState().formations)).not.toContain('sidebar')
    expect(useProject.getState().saveState).toBe('saved')
  })

  it('hides the notes panel until asked, leaves it out of the tab order, and remembers the choice', async () => {
    const user = userEvent.setup()
    useProject.getState().addNote({ text: 'Arms up' })
    render(<StagePage />, { wrapper: MemoryRouter })
    const panel = () => document.getElementById('stage-notes-panel')!
    expect(panel()).toHaveAttribute('inert')

    const toggle = screen.getByRole('button', { name: 'Show notes (1)' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(panel()).not.toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: 'Hide notes' })).toHaveAttribute('aria-expanded', 'true')
    expect(saved().notesOpen).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Hide notes' }))
    expect(panel()).toHaveAttribute('inert')
    expect(saved().notesOpen).toBe(false)
  })

  it('opens the notes as a drawer from the phone button', async () => {
    const user = userEvent.setup()
    useProject.getState().addNote({ text: 'Arms up' })
    render(<StagePage />, { wrapper: MemoryRouter })
    await user.click(screen.getByRole('button', { name: 'Notes (1)' }))
    expect(within(screen.getByRole('dialog', { name: 'Notes' })).getByText('Arms up')).toBeInTheDocument()
  })
})
