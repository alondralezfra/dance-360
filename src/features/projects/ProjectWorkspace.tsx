import { useEffect } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Input } from '../../components/ui/Input'
import { cn } from '../../lib/cn'
import { useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'
import type { SaveState } from '../../store/storeTypes'

/** The project's screens. Relative links resolve under /projects/:id. */
const tabs = [
  { to: 'stage', label: 'Stage' },
  { to: 'cast', label: 'Cast & Parts' },
]

const saveLabel: Record<SaveState, string> = {
  saved: 'Saved',
  dirty: 'Saving…',
  error: "Couldn't save",
}

/** Loads the project named in the URL and wraps its screens with the header. */
export function ProjectWorkspace() {
  const { projectId } = useParams()
  const loadProject = useProject((s) => s.loadProject)
  const closeProject = useProject((s) => s.closeProject)
  const openId = useProject((s) => s.projectId)
  const status = useProject((s) => s.status)
  const error = useProject((s) => s.error)
  const name = useProject((s) => s.name)
  const setProjectName = useProject((s) => s.setProjectName)
  const saveState = useProject((s) => s.saveState)

  useEffect(() => {
    if (!projectId) return
    useUi.getState().reset()
    void loadProject(projectId)
    return closeProject
  }, [projectId, loadProject, closeProject])

  // The store may still hold the previously open project for a moment.
  const ready = status === 'ready' && openId === projectId

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
          <Link to="/" className="text-lg font-semibold whitespace-nowrap hover:text-primary">
            Dance 360
          </Link>
          <span className="text-subtle-foreground">›</span>
          {ready ? (
            <Input
              value={name}
              onChange={(e) => setProjectName(e.target.value)}
              aria-label="Project name"
              className="min-w-0 max-w-56 border-transparent bg-transparent"
            />
          ) : (
            <span className="text-muted-foreground">Project</span>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {ready && (
            <span
              role="status"
              className={
                saveState === 'error' ? 'text-sm text-danger' : 'text-sm text-muted-foreground'
              }
            >
              {saveLabel[saveState]}
            </span>
          )}
          <ThemeToggle />
        </div>
      </header>

      {ready && (
        <nav aria-label="Project sections" className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-4">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  '-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      )}

      {ready && <Outlet />}
      {status === 'error' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-danger">{error}</p>
          <Link to="/" className="text-primary underline">
            Back to your projects
          </Link>
        </div>
      )}
      {!ready && status !== 'error' && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          Loading…
        </div>
      )}
    </div>
  )
}
