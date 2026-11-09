import type { Project } from '../model/types'
import { createRepository } from './createRepository'
import { localStorageRecordStore } from './localStorageRecordStore'
import { migrateProject } from './migrations'
import type { ProjectRepository, SyncSource } from './repository'

/** Where the original prototype kept its single project (zustand "persist" format). */
const LEGACY_KEY = 'dance360-project'

const base = createRepository(localStorageRecordStore)

/** Move the prototype's single saved project into the new multi-project storage. */
async function importLegacyProject() {
  const raw = localStorage.getItem(LEGACY_KEY)
  if (!raw) return
  try {
    const legacy = JSON.parse(raw) as { state?: Record<string, unknown>; version?: number }
    if (legacy.state) {
      const { currentFormationId: _ui, ...doc } = legacy.state
      const project: Project = migrateProject(legacy.version ?? 0, doc)
      await base.create(project)
    }
    // Only remove the old copy once the new one is safely written.
    localStorage.removeItem(LEGACY_KEY)
  } catch (error) {
    // Leave the legacy data untouched so nothing is lost.
    console.error('Could not import the previous project', error)
  }
}

/** The browser's localStorage, plus the one-time import of the old prototype's save when listing. */
export const localStorageRepository: ProjectRepository & SyncSource = {
  ...base,
  async list() {
    await importLegacyProject()
    return base.list()
  },
}
