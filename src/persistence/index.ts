import type { AudioRepository } from './audioRepository'
import { createIndexedDbAudioRepository } from './indexedDbAudioRepository'
import { localStorageRepository } from './localStorageRepository'
import type { ProjectRepository } from './repository'

/** The repository the app uses. Swap this line to move storage to the cloud. */
export const repository: ProjectRepository = localStorageRepository

/** Where song files are kept on this device (the project saves only their name, length and hash). */
export const audioRepository: AudioRepository = createIndexedDbAudioRepository()

export type { AudioRepository } from './audioRepository'
export type { ProjectRepository, ProjectSummary } from './repository'
