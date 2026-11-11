import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Button } from '../../components/ui/Button'
import { FileButton } from '../../components/ui/FileButton'
import { IconButton } from '../../components/ui/IconButton'
import { createEmptyProject } from '../../model/project'
import { ProjectFileError, repository, requestPersistentStorage, type ProjectSummary } from '../../persistence'
import { pruneUnusedAudio } from '../../store/audioCleanup'
import { exportProject, importProjectFile } from './backup'

export function ProjectsHome() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  // Something to tell the person about a backup or import that did not work.
  const [problem, setProblem] = useState<string | null>(null)

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
    void requestPersistentStorage() // a project worth keeping now exists: ask the browser not to clear it
    navigate(`/projects/${id}/stage`)
  }

  const backUp = async (p: ProjectSummary) => {
    setProblem(null)
    try {
      await exportProject(p.id)
    } catch (error) {
      console.error('Exporting a project failed', error)
      setProblem(`"${p.name}" could not be exported.`)
    }
  }

  const bringBack = async (file: File) => {
    setProblem(null)
    try {
      const id = await importProjectFile(file)
      navigate(`/projects/${id}/stage`)
    } catch (error) {
      if (error instanceof ProjectFileError) setProblem(error.message)
      else {
        console.error('Importing a project failed', error)
        setProblem('This file could not be imported. There may not be enough space on this device.')
      }
    }
  }

  const remove = async (p: ProjectSummary) => {
    if (!window.confirm(`Delete "${p.name}"? This can't be undone.`)) return
    await repository.remove(p.id)
    void pruneUnusedAudio() // the project's song file, if nothing else uses it
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
          <div className="flex flex-wrap gap-2">
            <FileButton accept=".json,application/json" onFile={(f) => void bringBack(f)}>
              Import project
            </FileButton>
            <Button variant="primary" onClick={create}>
              + New project
            </Button>
          </div>
        </div>

        {problem && (
          <div role="alert" className="mb-4 flex flex-wrap items-center gap-2 rounded-md bg-danger-soft p-2 text-sm text-danger">
            <p className="min-w-0 flex-1 basis-56">{problem}</p>
            <Button variant="ghost" onClick={() => setProblem(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {projects === null && <p className="text-muted-foreground">Loading…</p>}
        {projects?.length === 0 && (
          <p className="rounded-lg border border-dashed border-border-strong p-8 text-center text-muted-foreground">
            No projects yet. Create one to start building formations.
          </p>
        )}

        {/* grid-cols-1 (minmax(0, 1fr)) stops a long project name from stretching the column past the screen */}
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <IconButton
                variant="ghost"
                icon="download"
                label={`Export ${p.name}`}
                title="Save a backup file of this project"
                onClick={() => void backUp(p)}
              />
              <IconButton
                variant="danger-ghost"
                icon="close"
                label={`Delete ${p.name}`}
                title="Delete project"
                onClick={() => remove(p)}
              />
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
