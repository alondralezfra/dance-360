import { localStorageRepository } from './localStorageRepository'
import type { ProjectRepository } from './repository'

/** The repository the app uses. Swap this line to move storage to the cloud. */
export const repository: ProjectRepository = localStorageRepository

export type { ProjectRepository, ProjectSummary } from './repository'
