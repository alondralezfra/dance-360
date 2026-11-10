import { useEffect } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { cn } from '../../lib/cn'
import { useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'
import type { SaveState } from '../../store/storeTypes'
import { usePlaybackShortcut } from '../transport/usePlaybackShortcut'
import { UndoRedoButtons } from './UndoRedoButtons'
import { useUndoShortcuts } from './useUndoShortcuts'

/** The project's screens. Relative links resolve under /projects/:id. */
const tabs = [
  { to: 'stage', label: 'Stage' },
  { to: 'cast', label: 'Cast & Parts' },
  { to: 'song', label: 'Song' },
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
  useUndoShortcuts()
  usePlaybackShortcut()

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
      <header className="flex flex-wrap items-center gap-x-3 border-b border-border bg-surface px-4">
        <nav aria-label="Breadcrumb" className="order-1 flex min-w-0 flex-1 items-center gap-2 py-2 md:order-none md:flex-none">
          <Link to="/" className="text-lg font-semibold whitespace-nowrap hover:text-primary">
            Dance 360
          </Link>
          <Icon name="chevronRight" className="text-subtle-foreground" />
          {ready ? (
            <Input
              value={name}
              onChange={(e) => setProjectName(e.target.value)}
              aria-label="Project name"
              variant="inline"
              className="min-w-0 max-w-56"
            />
          ) : (
            <span className="text-muted-foreground">Project</span>
          )}
        </nav>
        {ready && (
          // On a phone the tabs share the second row with Undo/Redo: the row minus their width.
          <nav
            aria-label="Project sections"
            className="order-3 flex w-[calc(100%-5.75rem)] gap-1 overflow-x-auto md:order-none md:ml-2 md:w-auto"
          >
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap',
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
        {ready && <UndoRedoButtons className="order-4 md:order-none md:ml-auto" />}
        <div className={cn('order-2 ml-auto flex items-center gap-3 py-2 md:order-none', ready && 'md:ml-0')}>
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
