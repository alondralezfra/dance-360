import { createBrowserRouter, Navigate } from 'react-router'
import { CastPage } from './features/cast/CastPage'
import { NotFound } from './features/projects/NotFound'
import { ProjectsHome } from './features/projects/ProjectsHome'
import { ProjectWorkspace } from './features/projects/ProjectWorkspace'
import { SongPage } from './features/song/SongPage'
import { StagePage } from './features/stage/StagePage'

// URL map:   /                          projects home
//            /projects/:id/stage        the stage editor
//            /projects/:id/cast         parts, sections and the assignment grid
//            /projects/:id/song         the song, tempo and timeline
// Future project tabs (resources, notes, ...) become more children below
// (and an entry in `tabs` in ProjectWorkspace).
export const router = createBrowserRouter([
  { path: '/', element: <ProjectsHome /> },
  {
    path: '/projects/:projectId',
    element: <ProjectWorkspace />,
    children: [
      { index: true, element: <Navigate to="stage" replace /> },
      { path: 'stage', element: <StagePage /> },
      { path: 'cast', element: <CastPage /> },
      { path: 'song', element: <SongPage /> },
    ],
  },
  { path: '*', element: <NotFound /> },
])
