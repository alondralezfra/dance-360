// Backing a project up as a file, and reading one back (decisions/0021).
//
// The file is the project's saved document wrapped in a small header, as JSON. It never contains the
// song's audio (only its name, length and fingerprint, which is what a project stores anyway), so
// importing on another device asks for the music again, exactly as opening a project there does.
//
// A file picked by the person is untrusted input: it is checked thoroughly before anything is built
// from it, upgraded from an older data version if need be, and refused if it is from a newer one.

import { CURRENT_VERSION, migrateProject } from './migrations'
import { problemWithResources } from '../model/resources'
import type { Project } from '../model/types'

/** What marks a file as ours. */
export const PROJECT_FILE_KIND = 'dance-360-project'
/** The version of the file wrapper (not of the project data inside, which has its own). */
const PROJECT_FILE_VERSION = 1
/** Files bigger than this are refused: a real project is tens of kilobytes. */
export const MAX_PROJECT_FILE_BYTES = 5_000_000
/** Names are kept to a sensible length. */
const MAX_NAME_LENGTH = 120

/** A problem with a file, worded for the person who chose it. */
export class ProjectFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProjectFileError'
  }
}

/** The text to save as a backup file for this project. */
export function exportProjectFile(project: Project, now: Date = new Date()): string {
  return JSON.stringify(
    {
      kind: PROJECT_FILE_KIND,
      fileVersion: PROJECT_FILE_VERSION,
      dataVersion: CURRENT_VERSION,
      exportedAt: now.toISOString(),
      project,
    },
    null,
    2,
  )
}

/** A file name for the backup: "Spring Show 2026-11-10.dance360.json". Characters file systems refuse are dropped. */
export function projectFileName(projectName: string, now: Date = new Date()): string {
  const safe = [...projectName]
    .filter((c) => !'\\/:*?"<>|'.includes(c) && c.charCodeAt(0) >= 32)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
    .trim()
  return `${safe || 'Dance'} ${now.toISOString().slice(0, 10)}.dance360.json`
}

/** The project as an imported copy: same dance, with "(imported)" on its name so it is easy to tell apart. */
export function importedCopy(project: Project): Project {
  const name = project.name.trim() || 'Untitled dance'
  return { ...project, name: `${name} (imported)` }
}

// ---- reading a file back ------------------------------------------------------------------------

type Json = Record<string, unknown>

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
const isString = (v: unknown): v is string => typeof v === 'string'
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isArray = (v: unknown): v is unknown[] => Array.isArray(v)

const DAMAGED = 'This file looks damaged: it does not hold a complete Dance 360 project.'

/**
 * Checks the project is complete enough to open: every list is there and well formed, every number is a
 * number. (It does not check that the dance makes sense, only that nothing the app relies on is missing.)
 * Returns what was wrong, or null if it is fine.
 */
function problemWith(p: unknown): string | null {
  if (!isObject(p)) return 'the project is missing'
  if (!isString(p.name)) return 'it has no name'
  if (!isObject(p.stage) || !isNumber(p.stage.width) || !isNumber(p.stage.depth) || p.stage.width <= 0 || p.stage.depth <= 0) {
    return 'the stage size is wrong'
  }
  if (!isObject(p.tempo) || !isNumber(p.tempo.bpm) || p.tempo.bpm <= 0 || !isNumber(p.tempo.startOffsetSec) || !isArray(p.tempo.changes)) {
    return 'the tempo is wrong'
  }
  if (p.song !== null) {
    const s = p.song
    if (!isObject(s) || !isString(s.name) || !isNumber(s.durationSec) || !isNumber(s.size) || !isString(s.mime) || !isString(s.hash)) {
      return 'the song details are wrong'
    }
  }
  if (!isArray(p.dancers) || !p.dancers.every((d) => isObject(d) && isString(d.id) && d.id !== '' && isString(d.name))) {
    return 'the dancers are wrong'
  }
  if (
    !isArray(p.formations) ||
    p.formations.length === 0 ||
    !p.formations.every(
      (f) =>
        isObject(f) &&
        isString(f.id) &&
        f.id !== '' &&
        isString(f.name) &&
        isNumber(f.count) &&
        f.count >= 0 &&
        isNumber(f.transitionCounts) &&
        f.transitionCounts >= 0 &&
        isObject(f.positions) &&
        Object.values(f.positions).every((pt) => isObject(pt) && isNumber(pt.x) && isNumber(pt.y)),
    )
  ) {
    return 'the formations are wrong'
  }
  if (
    !isArray(p.parts) ||
    p.parts.length === 0 ||
    !p.parts.every(
      (x) =>
        isObject(x) &&
        isString(x.id) &&
        x.id !== '' &&
        isString(x.name) &&
        isString(x.color) &&
        (x.sectionIds === null || (isArray(x.sectionIds) && x.sectionIds.every(isString))),
    )
  ) {
    return 'the parts are wrong'
  }
  if (
    !isArray(p.sections) ||
    p.sections.length === 0 ||
    !p.sections.every((x) => isObject(x) && isString(x.id) && x.id !== '' && isString(x.name) && isNumber(x.startCount))
  ) {
    return 'the sections are wrong'
  }
  if (
    !isObject(p.assignments) ||
    !Object.values(p.assignments).every((bySection) => isObject(bySection) && Object.values(bySection).every(isString))
  ) {
    return 'the part assignments are wrong'
  }
  // Links come from outside the app, so they get the strictest look: only real web addresses, and only about things that exist.
  return problemWithResources(p as unknown as Pick<Project, 'resources' | 'sections' | 'parts'>)
}

/**
 * Reads the text of a backup file and returns the project in it, upgraded to the current data model.
 * Throws a `ProjectFileError` (with a message fit to show) if it is not one of our files, is too big,
 * is damaged, or was made by a newer version of the app.
 */
export function parseProjectFile(text: string): Project {
  if (text.length > MAX_PROJECT_FILE_BYTES) throw new ProjectFileError('This file is too large to be a Dance 360 project.')

  let file: unknown
  try {
    file = JSON.parse(text)
  } catch {
    throw new ProjectFileError('This is not a Dance 360 project file.')
  }
  if (!isObject(file) || file.kind !== PROJECT_FILE_KIND) throw new ProjectFileError('This is not a Dance 360 project file.')
  if (!isNumber(file.fileVersion) || file.fileVersion > PROJECT_FILE_VERSION) {
    throw new ProjectFileError('This file was made by a newer version of Dance 360. Update the app, then try again.')
  }
  const version = file.dataVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) throw new ProjectFileError(DAMAGED)
  if (!isObject(file.project)) throw new ProjectFileError(DAMAGED)

  let project: Project
  try {
    project = migrateProject(version, structuredClone(file.project))
  } catch (error) {
    if (version > CURRENT_VERSION) {
      throw new ProjectFileError('This project was saved by a newer version of Dance 360. Update the app, then try again.')
    }
    console.error('Importing a project file failed while upgrading it', error)
    throw new ProjectFileError(DAMAGED)
  }

  const problem = problemWith(project)
  if (problem) {
    console.error(`Importing a project file: ${problem}`)
    throw new ProjectFileError(DAMAGED)
  }
  return { ...project, name: project.name.slice(0, MAX_NAME_LENGTH) }
}
