import { createBrowserRouter, Navigate } from 'react-router'
import { NotFound } from './features/projects/NotFound'
import { ProjectsHome } from './features/projects/ProjectsHome'
import { ProjectWorkspace } from './features/projects/ProjectWorkspace'
import { StagePage } from './features/stage/StagePage'

// URL map:   /                          projects home
//            /projects/:id/stage        the stage editor
// Future project tabs (cast, resources, notes, ...) become more children below.
export const router = createBrowserRouter([
  { path: '/', element: <ProjectsHome /> },
  {
    path: '/projects/:projectId',
    element: <ProjectWorkspace />,
    children: [
      { index: true, element: <Navigate to="stage" replace /> },
      { path: 'stage', element: <StagePage /> },
    ],
  },
  { path: '*', element: <NotFound /> },
])
