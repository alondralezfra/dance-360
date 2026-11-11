// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProject } from '../../model/project'
import { PROJECT_FILE_KIND, exportProjectFile } from '../../persistence'
import type { ProjectSummary } from '../../persistence'

// Stand-ins the test controls (hoisted: the mocks below are set up before this file's imports run)
const { repository, requestPersistentStorage, download } = vi.hoisted(() => ({
  repository: {
    list: vi.fn<() => Promise<ProjectSummary[]>>(),
    create: vi.fn<(project: unknown) => Promise<string>>(),
    load: vi.fn<(id: string) => Promise<unknown>>(),
    remove: vi.fn<(id: string) => Promise<void>>(),
  },
  requestPersistentStorage: vi.fn(),
  download: vi.fn(),
}))
// Everything real except where projects are stored and the browser's storage request
vi.mock('../../persistence', async (importOriginal) => ({ ...(await importOriginal<object>()), repository, requestPersistentStorage }))
vi.mock('../../lib/download', () => ({ downloadTextFile: download }))

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
    expect(requestPersistentStorage).toHaveBeenCalledOnce() // a project worth keeping now exists
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

describe('backups', () => {
  const project = { ...createEmptyProject('Spring Show'), dancers: [{ id: 'd1', name: 'Maya' }] }
  const backupFile = (text = exportProjectFile(project)) => new File([text], 'Spring Show.dance360.json', { type: 'application/json' })
  const fileInput = (container: HTMLElement) => container.querySelector('input[type="file"]') as HTMLInputElement

  describe('exporting', () => {
    it('saves a backup file of that project, named for it', async () => {
      repository.list.mockResolvedValue([summary('a', 'Spring Show')])
      repository.load.mockResolvedValue(project)
      const user = userEvent.setup()
      renderHome()
      await user.click(await screen.findByRole('button', { name: 'Export Spring Show' }))
      await waitFor(() => expect(download).toHaveBeenCalledOnce())
      const [fileName, text] = download.mock.calls[0]
      expect(fileName).toMatch(/^Spring Show \d{4}-\d{2}-\d{2}\.dance360\.json$/)
      expect(JSON.parse(text)).toMatchObject({ kind: PROJECT_FILE_KIND, project: { name: 'Spring Show', dancers: [{ name: 'Maya' }] } })
      expect(repository.load).toHaveBeenCalledWith('a')
    })

    it('says so when the project cannot be read, and carries on', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      repository.list.mockResolvedValue([summary('a', 'Spring Show')])
      repository.load.mockResolvedValue(null)
      const user = userEvent.setup()
      renderHome()
      await user.click(await screen.findByRole('button', { name: 'Export Spring Show' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('"Spring Show" could not be exported.')
      expect(download).not.toHaveBeenCalled()
    })

    it('offers an export for every project', async () => {
      repository.list.mockResolvedValue([summary('a', 'Spring Show'), summary('b', 'Winter Gala')])
      renderHome()
      expect(await screen.findByRole('button', { name: 'Export Spring Show' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Export Winter Gala' })).toBeInTheDocument()
    })
  })

  describe('importing', () => {
    it('adds the project in the file as a new, marked copy and opens it', async () => {
      repository.create.mockResolvedValue('imported-id')
      const user = userEvent.setup()
      const { container } = renderHome()
      await screen.findByText(/No projects yet/)
      await user.upload(fileInput(container), backupFile())
      expect(await screen.findByText('Stage for project')).toBeInTheDocument()
      expect(repository.create).toHaveBeenCalledOnce()
      expect(repository.create.mock.calls[0][0]).toMatchObject({ name: 'Spring Show (imported)', dancers: [{ id: 'd1', name: 'Maya' }] })
      expect(requestPersistentStorage).toHaveBeenCalledOnce()
    })

    it('never touches a project that is already there: it only ever creates', async () => {
      repository.create.mockResolvedValue('imported-id')
      const user = userEvent.setup()
      const { container } = renderHome()
      await screen.findByText(/No projects yet/)
      await user.upload(fileInput(container), backupFile())
      await screen.findByText('Stage for project')
      expect(repository.remove).not.toHaveBeenCalled()
    })

    it('explains a file that is not a backup, and adds nothing', async () => {
      const user = userEvent.setup()
      const { container } = renderHome()
      await screen.findByText(/No projects yet/)
      await user.upload(fileInput(container), backupFile('{ definitely not json'))
      expect(await screen.findByRole('alert')).toHaveTextContent('This is not a Dance 360 project file.')
      expect(repository.create).not.toHaveBeenCalled()
      expect(screen.queryByText('Stage for project')).toBeNull()
    })

    it('explains a backup from a newer version of the app', async () => {
      const text = JSON.stringify({ kind: PROJECT_FILE_KIND, fileVersion: 1, dataVersion: 999, project })
      const user = userEvent.setup()
      const { container } = renderHome()
      await screen.findByText(/No projects yet/)
      await user.upload(fileInput(container), backupFile(text))
      expect(await screen.findByRole('alert')).toHaveTextContent('newer version of Dance 360')
      expect(repository.create).not.toHaveBeenCalled()
    })

    it('says so when it could not be stored (for instance, no space left)', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      repository.create.mockRejectedValue(new DOMException('full', 'QuotaExceededError'))
      const user = userEvent.setup()
      const { container } = renderHome()
      await screen.findByText(/No projects yet/)
      await user.upload(fileInput(container), backupFile())
      expect(await screen.findByRole('alert')).toHaveTextContent('could not be imported')
    })

    it('lets the message be dismissed, and clears it on the next try', async () => {
      repository.create.mockResolvedValue('imported-id')
      const user = userEvent.setup()
      const { container } = renderHome()
      await screen.findByText(/No projects yet/)
      await user.upload(fileInput(container), backupFile('nope'))
      await user.click(await screen.findByRole('button', { name: 'Dismiss' }))
      expect(screen.queryByRole('alert')).toBeNull()
      await user.upload(fileInput(container), backupFile('nope'))
      await screen.findByRole('alert')
      await user.upload(fileInput(container), backupFile())
      await screen.findByText('Stage for project')
    })

    it('refuses a huge file without reading it', async () => {
      const user = userEvent.setup()
      const { container } = renderHome()
      await screen.findByText(/No projects yet/)
      const huge = new File(['{}'], 'big.json')
      Object.defineProperty(huge, 'size', { value: 6_000_000 })
      await user.upload(fileInput(container), huge)
      expect(await screen.findByRole('alert')).toHaveTextContent('too large')
      expect(repository.create).not.toHaveBeenCalled()
    })
  })
})
