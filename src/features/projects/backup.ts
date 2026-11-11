import { downloadTextFile } from '../../lib/download'
import {
  MAX_PROJECT_FILE_BYTES,
  ProjectFileError,
  exportProjectFile,
  importedCopy,
  parseProjectFile,
  projectFileName,
  repository,
  requestPersistentStorage,
} from '../../persistence'

// Backing a project up to a file and bringing one back (decisions/0021). Used by the projects home and the error screen.

/** Saves a copy of a stored project as a file in the person's downloads. Throws if it cannot be read. */
export async function exportProject(id: string): Promise<void> {
  const project = await repository.load(id)
  if (!project) throw new Error('That project could not be found.')
  downloadTextFile(projectFileName(project.name), exportProjectFile(project))
}

/**
 * Adds the project in a backup file as a new project (never over an existing one) and returns its id.
 * Throws a `ProjectFileError`, worded for the person, if the file is not a usable backup.
 */
export async function importProjectFile(file: File): Promise<string> {
  if (file.size > MAX_PROJECT_FILE_BYTES) throw new ProjectFileError('This file is too large to be a Dance 360 project.')
  const project = parseProjectFile(await file.text())
  const id = await repository.create(importedCopy(project))
  void requestPersistentStorage() // a project worth keeping now exists: ask the browser not to clear it
  return id
}
