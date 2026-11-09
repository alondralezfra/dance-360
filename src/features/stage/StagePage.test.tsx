// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  useLayout.setState({ sidebarOpen: true, formationBarOpen: true })
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
  useUi.getState().reset()
})

const saved = () => JSON.parse(localStorage.getItem('dance360:device-preferences') ?? '{}')

describe('collapsible panels', () => {
  it('hides and shows the dancer sidebar, and its contents leave the tab order while hidden', async () => {
    const user = userEvent.setup()
    render(<StagePage />)
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
    render(<StagePage />)
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
    render(<StagePage />)
    await user.click(screen.getByRole('button', { name: 'Hide dancer panel' }))
    await user.click(screen.getByRole('button', { name: 'Hide formation bar' }))
    expect(saved()).toEqual({ sidebarOpen: false, formationBarOpen: false })
  })

  it('does not put the panel state in the project', async () => {
    const user = userEvent.setup()
    render(<StagePage />)
    await user.click(screen.getByRole('button', { name: 'Hide dancer panel' }))
    expect(JSON.stringify(useProject.getState().formations)).not.toContain('sidebar')
    expect(useProject.getState().saveState).toBe('saved')
  })
})
