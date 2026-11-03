// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectSummary } from '../../persistence'

const repository = {
  list: vi.fn<() => Promise<ProjectSummary[]>>(),
  create: vi.fn<() => Promise<string>>(),
  remove: vi.fn<(id: string) => Promise<void>>(),
}
vi.mock('../../persistence', () => ({ repository }))

const { ProjectsHome } = await import('./ProjectsHome')

const renderHome = () =>
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<ProjectsHome />} />
        <Route path="/projects/:id/stage" element={<p>Stage for project</p>} />
      </Routes>
    </MemoryRouter>,
  )

const summary = (id: string, name: string): ProjectSummary => ({ id, name, updatedAt: 1_700_000_000_000 })

beforeEach(() => {
  vi.resetAllMocks()
  repository.list.mockResolvedValue([])
})

describe('ProjectsHome', () => {
  it('shows an empty state with a way to create a project', async () => {
    renderHome()
    expect(await screen.findByText(/No projects yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ New project' })).toBeInTheDocument()
  })

  it('lists existing projects as links to their stage', async () => {
    repository.list.mockResolvedValue([summary('a', 'Spring Showcase'), summary('b', 'Winter Gala')])
    renderHome()
    const link = await screen.findByRole('link', { name: /Spring Showcase/ })
    expect(link).toHaveAttribute('href', '/projects/a/stage')
    expect(screen.getByRole('link', { name: /Winter Gala/ })).toBeInTheDocument()
    expect(screen.queryByText(/No projects yet/)).not.toBeInTheDocument()
  })

  it('creates a project and opens it', async () => {
    repository.create.mockResolvedValue('new-id')
    const user = userEvent.setup()
    renderHome()
    await user.click(await screen.findByRole('button', { name: '+ New project' }))
    expect(await screen.findByText('Stage for project')).toBeInTheDocument()
    expect(repository.create).toHaveBeenCalledOnce()
  })

  it('deletes a project after confirmation', async () => {
    repository.list.mockResolvedValue([summary('a', 'Spring Showcase')])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderHome()
    await user.click(await screen.findByRole('button', { name: 'Delete Spring Showcase' }))
    expect(repository.remove).toHaveBeenCalledWith('a')
    await waitFor(() => expect(screen.queryByText('Spring Showcase')).not.toBeInTheDocument())
  })

  it('keeps the project when deletion is cancelled', async () => {
    repository.list.mockResolvedValue([summary('a', 'Spring Showcase')])
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderHome()
    await user.click(await screen.findByRole('button', { name: 'Delete Spring Showcase' }))
    expect(repository.remove).not.toHaveBeenCalled()
    expect(screen.getByText('Spring Showcase')).toBeInTheDocument()
  })
})
