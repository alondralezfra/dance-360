import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Button } from '../../components/ui/Button'
import { createEmptyProject } from '../../model/project'
import { repository, type ProjectSummary } from '../../persistence'

export function ProjectsHome() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void repository.list().then((list) => {
      if (!cancelled) setProjects(list)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const create = async () => {
    const id = await repository.create(createEmptyProject('Untitled dance'))
    navigate(`/projects/${id}/stage`)
  }

  const remove = async (p: ProjectSummary) => {
    if (!window.confirm(`Delete "${p.name}"? This can't be undone.`)) return
    await repository.remove(p.id)
    setProjects((list) => list?.filter((x) => x.id !== p.id) ?? null)
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2">
        <h1 className="text-lg font-semibold">Dance 360</h1>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your projects</h2>
          <Button variant="primary" onClick={create}>
            + New project
          </Button>
        </div>

        {projects === null && <p className="text-muted-foreground">Loading…</p>}
        {projects?.length === 0 && (
          <p className="rounded-lg border border-dashed border-border-strong p-8 text-center text-muted-foreground">
            No projects yet. Create one to start building formations.
          </p>
        )}

        <ul className="grid gap-3 sm:grid-cols-2">
          {projects?.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface p-3"
            >
              <Link to={`/projects/${p.id}/stage`} className="min-w-0 flex-1">
                <div className="truncate font-medium">{p.name || 'Untitled'}</div>
                <div className="text-sm text-muted-foreground">
                  Edited {new Date(p.updatedAt).toLocaleDateString()}
                </div>
              </Link>
              <Button
                variant="danger-ghost"
                size="icon"
                onClick={() => remove(p)}
                aria-label={`Delete ${p.name}`}
                title="Delete project"
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
