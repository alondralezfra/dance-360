// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../../model/project'
import { useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'
import { OverviewPage } from './OverviewPage'

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
  useUi.getState().reset()
})

const s = () => useProject.getState()

function renderPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/projects/:id',
        children: [
          { path: 'overview', element: <OverviewPage /> },
          { path: 'cast', element: <p>Cast screen</p> },
          { path: 'stage', element: <p>Stage screen</p> },
        ],
      },
    ],
    { initialEntries: ['/projects/test/overview'] },
  )
  render(<RouterProvider router={router} />)
}

describe('the Overview tab', () => {
  it('says there are no problems in an empty project and summarises it', () => {
    renderPage()
    expect(screen.getByText(/No problems/)).toBeInTheDocument()
    expect(screen.getByText('Song').nextSibling).toHaveTextContent('None yet')
    expect(screen.getByText('Dancers').nextSibling).toHaveTextContent('0')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('lists a formation that leaves a dancer out, and goes to the stage with it selected', async () => {
    const user = userEvent.setup()
    s().addDancer('Ana')
    s().addDancer('Bo')
    const first = s().formations[0].id
    const second = s().addFormation(first)
    useProject.setState((st) => ({
      formations: st.formations.map((f) =>
        f.id === second ? { ...f, positions: { [st.dancers[0].id]: { x: 5, y: 5 } } } : f,
      ),
    }))
    renderPage()
    const link = screen.getByRole('link', { name: /has 1 of 2 dancers placed/ })
    await user.click(link)
    expect(screen.getByText('Stage screen')).toBeInTheDocument()
    expect(useUi.getState().currentFormationId).toBe(second)
  })

  it('lists dancers with no part in a section, and goes to Cast & Parts', async () => {
    const user = userEvent.setup()
    s().addDancer('Ana')
    s().addPart()
    s().addPart()
    renderPage()
    const link = screen.getByRole('link', { name: /1 dancer has no part in/ })
    expect(link).toHaveTextContent('Ana')
    await user.click(link)
    expect(screen.getByText('Cast screen')).toBeInTheDocument()
  })

  it('updates when the problem is fixed', () => {
    s().addDancer('Ana')
    s().addPart()
    s().addPart()
    renderPage()
    expect(screen.getByRole('link', { name: /no part in/ })).toBeInTheDocument()
    act(() => {
      for (const section of s().sections) s().assignDancer(section.id, s().dancers[0].id, s().parts[0].id)
    })
    expect(screen.queryByRole('link', { name: /no part in/ })).not.toBeInTheDocument()
    expect(screen.getByText(/No problems/)).toBeInTheDocument()
  })
})
