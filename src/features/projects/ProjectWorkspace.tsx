import { useEffect } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Icon, type IconName } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { cn } from '../../lib/cn'
import { useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'
import type { SaveState } from '../../store/storeTypes'
import { usePlaybackShortcut } from '../transport/usePlaybackShortcut'
import { UndoRedoButtons } from './UndoRedoButtons'
import { useUndoShortcuts } from './useUndoShortcuts'

/** The project's screens. Relative links resolve under /projects/:id. */
const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: 'overview', label: 'Overview', icon: 'overview' },
  { to: 'stage', label: 'Stage', icon: 'stage' },
  { to: 'cast', label: 'Cast & Parts', icon: 'cast' },
  { to: 'song', label: 'Song', icon: 'song' },
  { to: 'resources', label: 'Resources', icon: 'link' },
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
    // When the section tabs are a fixed bar along the bottom (below), the page keeps clear of it.
    <div className="flex h-dvh flex-col bg-background text-foreground tabbar:pb-[calc(3.5rem+env(safe-area-inset-bottom))] tabbar:short:pb-[calc(2.75rem+env(safe-area-inset-bottom))]">
      <header className="flex flex-wrap items-center gap-x-3 border-b border-border bg-surface px-4">
        {/* Below 640px the header is two rows, by letting this nav's children join the header's own row: the app link and
            save status on the first, the project name and Undo/Redo on the second (so the name can be read). Wider, one row. */}
        <nav aria-label="Breadcrumb" className="contents sm:flex sm:min-w-0 sm:items-center sm:gap-2 sm:py-2">
          <Link to="/" className="text-lg font-semibold whitespace-nowrap hover:text-link max-sm:order-1">
            Dance 360
          </Link>
          <Icon name="chevronRight" className="hidden text-subtle-foreground sm:block" />
          {ready ? (
            // Below 640px it fills the second row beside Undo/Redo (the row minus their width). Wider, a fixed width,
            // modest until there is room: the one-row header is only just wide enough at 150% browser zoom, and a name
            // box sized by its default width tipped it onto two rows in a wide font.
            <Input
              value={name}
              onChange={(e) => setProjectName(e.target.value)}
              aria-label="Project name"
              variant="inline"
              className="min-w-0 max-sm:order-3 max-sm:w-[calc(100%-5.75rem)] sm:w-32 lg:w-56"
            />
          ) : (
            <span className="text-muted-foreground max-sm:order-3">Project</span>
          )}
        </nav>
        {ready && (
          // Inline in the header, or (the `tabbar` variant, see index.css) a bar along the bottom edge: five equal tabs, icon
          // above label (beside it in a short window), clear of a home indicator.
          <nav
            aria-label="Project sections"
            className="ml-2 flex gap-1 tabbar:fixed tabbar:inset-x-0 tabbar:bottom-0 tabbar:z-30 tabbar:ml-0 tabbar:gap-0 tabbar:border-t tabbar:border-border tabbar:bg-surface tabbar:pb-[env(safe-area-inset-bottom)]"
          >
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center border-b-2 px-1.5 text-sm font-medium whitespace-nowrap lg:px-3',
                    'tabbar:min-h-13 tabbar:flex-1 tabbar:flex-col tabbar:justify-center tabbar:gap-0.5 tabbar:border-t-2 tabbar:border-b-0 tabbar:px-1 tabbar:text-center tabbar:text-xs tabbar:leading-tight tabbar:whitespace-normal',
                    'tabbar:short:min-h-10 tabbar:short:flex-row tabbar:short:gap-2',
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )
                }
              >
                <Icon name={tab.icon} className="hidden size-5 tabbar:block" />
                {tab.label}
              </NavLink>
            ))}
          </nav>
        )}
        {ready && <UndoRedoButtons className="max-sm:order-4 sm:ml-auto" />}
        <div className={cn('ml-auto flex items-center gap-3 py-2 max-sm:order-2', ready && 'sm:ml-0')}>
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
          <Link to="/" className="text-link underline">
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
