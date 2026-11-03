import type { Id, Project } from '../model/types'
import { repository } from '../persistence'
import { useProject } from './projectStore'
import { DOCUMENT_KEYS, selectDocument } from './storeTypes'

const DELAY_MS = 400

let pending: { id: Id; project: Project } | null = null
let timer: ReturnType<typeof setTimeout> | null = null

async function flush() {
  if (timer) clearTimeout(timer)
  timer = null
  const job = pending
  pending = null
  if (!job) return
  try {
    await repository.save(job.id, job.project)
    if (useProject.getState().projectId === job.id && !pending) {
      useProject.setState({ saveState: 'saved' })
    }
  } catch (e) {
    console.error('Autosave failed', e)
    if (useProject.getState().projectId === job.id) {
      useProject.setState({ saveState: 'error' })
    }
  }
}

/**
 * Saves the open project shortly after any change to it. Switching projects or
 * closing the tab saves immediately. Call once at startup.
 */
export function startAutosave() {
  const unsubscribe = useProject.subscribe((state, prev) => {
    const sameProject = state.projectId === prev.projectId
    if (!sameProject) {
      void flush() // never leave the previous project's changes unsaved
      return
    }
    if (state.status !== 'ready' || prev.status !== 'ready' || !state.projectId) return
    if (DOCUMENT_KEYS.every((k) => state[k] === prev[k])) return

    pending = { id: state.projectId, project: selectDocument(state) }
    useProject.setState({ saveState: 'dirty' })
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void flush(), DELAY_MS)
  })

  const onHide = () => void flush()
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') onHide()
  }
  window.addEventListener('pagehide', onHide)
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    unsubscribe()
    window.removeEventListener('pagehide', onHide)
    document.removeEventListener('visibilitychange', onVisibility)
    void flush()
  }
}
