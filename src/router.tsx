import { createBrowserRouter, Navigate } from 'react-router'
import { CastPage } from './features/cast/CastPage'
import { ErrorScreen } from './features/projects/ErrorScreen'
import { NotFound } from './features/projects/NotFound'
import { ProjectsHome } from './features/projects/ProjectsHome'
import { ProjectWorkspace } from './features/projects/ProjectWorkspace'
import { ResourcesPage } from './features/resources/ResourcesPage'
import { SongPage } from './features/song/SongPage'
import { StagePage } from './features/stage/StagePage'

// URL map:   /                          projects home
//            /projects/:id/stage        the stage editor
//            /projects/:id/cast         parts, sections and the assignment grid
//            /projects/:id/song         the song, tempo and timeline
//            /projects/:id/resources    links to videos and documents
// Future project tabs become more children below
// (and an entry in `tabs` in ProjectWorkspace).
export const router = createBrowserRouter([
  // A screen that crashes shows the error screen (with a way to download the open project), not a blank page.
  { path: '/', element: <ProjectsHome />, errorElement: <ErrorScreen /> },
  {
    path: '/projects/:projectId',
    element: <ProjectWorkspace />,
    errorElement: <ErrorScreen />,
    children: [
      { index: true, element: <Navigate to="stage" replace /> },
      { path: 'stage', element: <StagePage /> },
      { path: 'cast', element: <CastPage /> },
      { path: 'song', element: <SongPage /> },
      { path: 'resources', element: <ResourcesPage /> },
    ],
  },
  { path: '*', element: <NotFound /> },
])
