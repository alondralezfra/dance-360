import { useEffect, useState } from 'react'
import { Link, useParams, useRouteError } from 'react-router'
import { Button } from '../../components/ui/Button'
import { exportProject } from './backup'

const describe = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unknown error.'

/**
 * What the person sees when a screen crashes, instead of a blank page. It reassures (work is autosaved),
 * offers to reload or go back, and, if a project was open, to download a backup file of it so a crash
 * can never trap their work. Used as the `errorElement` of the routes (decisions/0021).
 */
export function ErrorScreen({ reload = () => window.location.reload() }: { reload?: () => void }) {
  const error = useRouteError()
  const { projectId } = useParams()
  const [downloadFailed, setDownloadFailed] = useState(false)

  useEffect(() => {
    console.error('The app crashed', error)
  }, [error])

  const download = async () => {
    setDownloadFailed(false)
    try {
      await exportProject(projectId!)
    } catch (failure) {
      console.error('Downloading a backup from the error screen failed', failure)
      setDownloadFailed(true)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
      <div role="alert" className="grid max-w-md gap-2">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground">
          Your work is saved automatically as you go, so what you did a moment ago should be safe. Try reloading the page.
          {projectId && ' If it keeps happening, download a backup of this project first.'}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={reload}>
          Reload
        </Button>
        {projectId && <Button onClick={() => void download()}>Download this project</Button>}
        <Link
          to="/"
          className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-medium text-link underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Back to your projects
        </Link>
      </div>

      {downloadFailed && (
        <p role="status" className="text-sm text-danger">
          The backup could not be made: this project could not be read.
        </p>
      )}

      <details className="max-w-md text-sm text-muted-foreground">
        <summary className="cursor-pointer">Technical details</summary>
        <pre className="mt-2 overflow-x-auto rounded-md bg-surface p-2 text-left whitespace-pre-wrap">{describe(error)}</pre>
      </details>
    </div>
  )
}
