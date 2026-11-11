// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const exportProject = vi.hoisted(() => vi.fn<(id: string) => Promise<void>>())
vi.mock('./backup', () => ({ exportProject }))

const { ErrorScreen } = await import('./ErrorScreen')

function Crash({ message = 'Cannot read properties of undefined' }: { message?: string }): never {
  throw new Error(message)
}

/** Renders a route that crashes, shown at `path`, with the error screen as its error element. */
function renderCrashAt(path: string, reload = vi.fn()) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>Projects home</p> },
      { path: '/projects/:projectId/stage', element: <Crash />, errorElement: <ErrorScreen reload={reload} /> },
      { path: '/crash', element: <Crash message="Boom" />, errorElement: <ErrorScreen reload={reload} /> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return { router, reload }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('ErrorScreen', () => {
  it('tells the person something went wrong and that their work is saved, as an alert', () => {
    renderCrashAt('/crash')
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('alert')).toHaveTextContent('saved automatically')
  })

  it('reloads the page when asked', async () => {
    const { reload } = renderCrashAt('/crash')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reload' }))
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('offers a way back to the projects, and it works', async () => {
    renderCrashAt('/crash')
    await userEvent.setup().click(screen.getByRole('link', { name: 'Back to your projects' }))
    expect(await screen.findByText('Projects home')).toBeInTheDocument()
  })

  it('keeps the technical message for whoever needs it, tucked away', () => {
    renderCrashAt('/crash')
    expect(screen.getByText('Technical details')).toBeInTheDocument()
    expect(screen.getByText('Boom')).toBeInTheDocument()
  })

  it('writes the error to the console', () => {
    renderCrashAt('/crash')
    expect(console.error).toHaveBeenCalledWith('The app crashed', expect.objectContaining({ message: 'Boom' }))
  })

  it('does not offer a download when no project was open', () => {
    renderCrashAt('/crash')
    expect(screen.queryByRole('button', { name: 'Download this project' })).toBeNull()
    expect(screen.getByRole('alert')).not.toHaveTextContent('download a backup')
  })

  describe('with a project open', () => {
    it('offers to download that project, and says why', () => {
      renderCrashAt('/projects/abc/stage')
      expect(screen.getByRole('button', { name: 'Download this project' })).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('download a backup of this project')
    })

    it('downloads the project that was open', async () => {
      exportProject.mockResolvedValue()
      renderCrashAt('/projects/abc/stage')
      await userEvent.setup().click(screen.getByRole('button', { name: 'Download this project' }))
      expect(exportProject).toHaveBeenCalledExactlyOnceWith('abc')
      expect(screen.queryByRole('status')).toBeNull()
    })

    it('says so when the project cannot be read, and lets the person try again', async () => {
      exportProject.mockRejectedValueOnce(new Error('unreadable')).mockResolvedValueOnce()
      const user = userEvent.setup()
      renderCrashAt('/projects/abc/stage')
      await user.click(screen.getByRole('button', { name: 'Download this project' }))
      expect(await screen.findByRole('status')).toHaveTextContent('could not be read')
      await user.click(screen.getByRole('button', { name: 'Download this project' }))
      await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
      expect(exportProject).toHaveBeenCalledTimes(2)
    })

    it('still offers to reload and to go back', () => {
      renderCrashAt('/projects/abc/stage')
      expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Back to your projects' })).toHaveAttribute('href', '/')
    })
  })
})
