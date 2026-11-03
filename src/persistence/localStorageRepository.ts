import { newId } from '../model/project'
import type { Id, Project } from '../model/types'
import { CURRENT_VERSION, migrateProject } from './migrations'
import type { ProjectRepository, ProjectSummary } from './repository'

const PREFIX = 'dance360:project:'
/** Where the original prototype kept its single project (zustand "persist" format). */
const LEGACY_KEY = 'dance360-project'

interface Envelope {
  version: number
  updatedAt: number
  project: Record<string, unknown>
}

function readEnvelope(id: Id): Envelope | null {
  const raw = localStorage.getItem(PREFIX + id)
  if (!raw) return null
  return JSON.parse(raw) as Envelope
}

function writeEnvelope(id: Id, project: Project) {
  const envelope: Envelope = {
    version: CURRENT_VERSION,
    updatedAt: Date.now(),
    project: project as unknown as Record<string, unknown>,
  }
  localStorage.setItem(PREFIX + id, JSON.stringify(envelope))
}

/** Move the prototype's single saved project into the new multi-project storage. */
function importLegacyProject() {
  const raw = localStorage.getItem(LEGACY_KEY)
  if (!raw) return
  try {
    const legacy = JSON.parse(raw) as { state?: Record<string, unknown>; version?: number }
    if (legacy.state) {
      const { currentFormationId: _ui, ...doc } = legacy.state
      const project = migrateProject(legacy.version ?? 0, doc)
      writeEnvelope(newId(), project)
    }
    // Only remove the old copy once the new one is safely written.
    localStorage.removeItem(LEGACY_KEY)
  } catch (error) {
    // Leave the legacy data untouched so nothing is lost.
    console.error('Could not import the previous project', error)
  }
}

export const localStorageRepository: ProjectRepository = {
  async list() {
    importLegacyProject()
    const summaries: ProjectSummary[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(PREFIX)) continue
      const id = key.slice(PREFIX.length)
      try {
        const env = readEnvelope(id)
        if (env) {
          summaries.push({
            id,
            name: String(env.project.name ?? 'Untitled'),
            updatedAt: env.updatedAt,
          })
        }
      } catch {
        // Skip unreadable entries rather than hiding every project.
      }
    }
    return summaries.sort((a, b) => b.updatedAt - a.updatedAt)
  },

  async load(id) {
    const env = readEnvelope(id)
    if (!env) return null
    return migrateProject(env.version, env.project)
  },

  async save(id, project) {
    writeEnvelope(id, project)
  },

  async create(project) {
    const id = newId()
    writeEnvelope(id, project)
    return id
  },

  async remove(id) {
    localStorage.removeItem(PREFIX + id)
  },
}
