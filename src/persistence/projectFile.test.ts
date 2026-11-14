import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProject } from '../model/project'
import type { Project } from '../model/types'
import { CURRENT_VERSION } from './migrations'
import {
  MAX_PROJECT_FILE_BYTES,
  PROJECT_FILE_KIND,
  ProjectFileError,
  exportProjectFile,
  importedCopy,
  parseProjectFile,
  projectFileName,
} from './projectFile'

const fixtures = import.meta.glob('./fixtures/v*.json', { eager: true, import: 'default' }) as Record<string, Record<string, unknown>>
const byVersion = Object.entries(fixtures)
  .map(([path, doc]) => ({ version: Number(path.match(/v(\d+)\.json$/)![1]), doc }))
  .sort((a, b) => a.version - b.version)

/** A project with something in every list. */
function richProject(): Project {
  const project = createEmptyProject('Spring Show')
  return {
    ...project,
    dancers: [
      { id: 'd1', name: 'Maya' },
      { id: 'd2', name: 'Jo' },
    ],
    formations: [
      { ...project.formations[0], positions: { d1: { x: 10, y: 8 }, d2: { x: 20.5, y: 8 } } },
      { id: 'f2', name: 'Cross', count: 16, transitionCounts: 4, positions: { d1: { x: 20, y: 12 }, d2: { x: 10, y: 12 } } },
    ],
    assignments: { [project.sections[0].id]: { d1: project.parts[0].id } },
    song: { name: 'Groove.mp3', durationSec: 201.4, size: 4_812_345, mime: 'audio/mpeg', hash: 'abc123' },
    tempo: { bpm: 127.5, startOffsetSec: 1.26, changes: [] },
    resources: [
      {
        id: 'r1',
        title: 'Chorus tutorial',
        url: 'https://www.youtube.com/watch?v=abc',
        kind: 'tutorial',
        sectionId: project.sections[0].id,
        partId: project.parts[0].id,
        startSec: 83,
      },
    ],
    notes: [
      { id: 'n1', text: 'Arms up on 5-6', anchor: { kind: 'count', count: 20 }, partId: project.parts[0].id },
      { id: 'n2', text: 'Smile.\nBig.', anchor: { kind: 'section', sectionId: project.sections[0].id }, partId: null },
      { id: 'n3', text: 'Whole dance note', anchor: { kind: 'dance' }, partId: null },
    ],
  }
}

/** A backup file with `project` (or something else) in it. */
const fileWith = (project: unknown, over: Record<string, unknown> = {}) =>
  JSON.stringify({ kind: PROJECT_FILE_KIND, fileVersion: 1, dataVersion: CURRENT_VERSION, exportedAt: '2026-11-10T00:00:00.000Z', project, ...over })

beforeEach(() => void vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe('exportProjectFile', () => {
  it('wraps the project in a header that says what it is, which versions made it, and when', () => {
    const file = JSON.parse(exportProjectFile(richProject(), new Date('2026-11-10T09:30:00Z')))
    expect(file).toMatchObject({
      kind: PROJECT_FILE_KIND,
      fileVersion: 1,
      dataVersion: CURRENT_VERSION,
      exportedAt: '2026-11-10T09:30:00.000Z',
    })
    expect(file.project.name).toBe('Spring Show')
  })

  it('keeps the song details but never any audio', () => {
    const text = exportProjectFile(richProject())
    expect(JSON.parse(text).project.song).toEqual({ name: 'Groove.mp3', durationSec: 201.4, size: 4_812_345, mime: 'audio/mpeg', hash: 'abc123' })
    expect(text.length).toBeLessThan(10_000)
  })

  it('is readable text, so it can be looked at or kept in version control', () => {
    expect(exportProjectFile(richProject())).toContain('\n  "kind"')
  })
})

describe('reading a backup back', () => {
  it('gets exactly the project that was exported', () => {
    const project = richProject()
    expect(parseProjectFile(exportProjectFile(project))).toEqual(project)
  })

  it('does not change the text or anything shared with it', () => {
    const text = exportProjectFile(richProject())
    const before = text.slice()
    parseProjectFile(text)
    expect(text).toBe(before)
  })

  for (const { version, doc } of byVersion) {
    it(`upgrades a project saved by data version ${version} to the current one`, () => {
      const project = parseProjectFile(fileWith(doc, { dataVersion: version }))
      expect(project.parts.length).toBeGreaterThan(0)
      expect(project.sections.length).toBeGreaterThan(0)
      expect(project.tempo.changes).toEqual([])
      expect(project.song === null || typeof project.song === 'object').toBe(true)
      expect(project.formations.length).toBeGreaterThan(0)
    })
  }

  it('cuts an absurdly long name down', () => {
    const project = parseProjectFile(fileWith({ ...createEmptyProject(), name: 'x'.repeat(500) }))
    expect(project.name).toHaveLength(120)
  })

  it('ignores extra fields in the header', () => {
    expect(() => parseProjectFile(fileWith(createEmptyProject(), { note: 'hello', anything: [1, 2] }))).not.toThrow()
  })

  describe('refuses what is not a backup', () => {
    const refused = (text: string, message: RegExp) => {
      expect(() => parseProjectFile(text)).toThrow(ProjectFileError)
      expect(() => parseProjectFile(text)).toThrow(message)
    }

    it('text that is not JSON, or JSON that is not ours', () => {
      refused('', /not a Dance 360 project file/)
      refused('{ not json', /not a Dance 360 project file/)
      refused('[1,2,3]', /not a Dance 360 project file/)
      refused('"hello"', /not a Dance 360 project file/)
      refused('null', /not a Dance 360 project file/)
      refused(JSON.stringify({ kind: 'something-else', project: {} }), /not a Dance 360 project file/)
      refused(JSON.stringify({ name: 'a project with no wrapper', formations: [] }), /not a Dance 360 project file/)
    })

    it('a file that is far too large', () => {
      refused(' '.repeat(MAX_PROJECT_FILE_BYTES + 1), /too large/)
    })

    it('a file made by a newer version of the app, whether its wrapper or its data', () => {
      refused(fileWith(createEmptyProject(), { fileVersion: 2 }), /newer version of Dance 360/)
      refused(fileWith(createEmptyProject(), { dataVersion: CURRENT_VERSION + 1 }), /newer version of Dance 360/)
    })

    it('a header with no usable version or project', () => {
      refused(fileWith(createEmptyProject(), { fileVersion: 'one' }), /newer version|not a Dance/)
      refused(fileWith(createEmptyProject(), { dataVersion: 'four' }), /damaged/)
      refused(fileWith(createEmptyProject(), { dataVersion: -1 }), /damaged/)
      refused(fileWith(createEmptyProject(), { dataVersion: 2.5 }), /damaged/)
      refused(fileWith(null), /damaged/)
      refused(fileWith([1]), /damaged/)
      refused(fileWith('a project'), /damaged/)
    })
  })

  describe('refuses a project that is not complete', () => {
    const damaged = (change: (p: Record<string, unknown>) => void) => {
      const project = structuredClone(richProject()) as unknown as Record<string, unknown>
      change(project)
      expect(() => parseProjectFile(fileWith(project))).toThrow(/damaged/)
    }

    it('with a missing or wrongly typed part', () => {
      damaged((p) => delete p.name)
      damaged((p) => (p.name = 5))
      damaged((p) => (p.stage = { width: 40 }))
      damaged((p) => (p.stage = { width: 0, depth: 24 }))
      damaged((p) => (p.tempo = { bpm: 'fast', startOffsetSec: 0, changes: [] }))
      damaged((p) => (p.tempo = { bpm: 120, startOffsetSec: 0 }))
      damaged((p) => (p.song = { name: 'x' }))
      damaged((p) => (p.dancers = 'Maya'))
      damaged((p) => (p.dancers = [{ name: 'no id' }]))
      damaged((p) => (p.formations = []))
      damaged((p) => (p.formations = [{ id: 'f', name: 'x', count: -1, transitionCounts: 4, positions: {} }]))
      damaged((p) => (p.formations = [{ id: 'f', name: 'x', count: 0, transitionCounts: 4, positions: { d1: { x: 'left', y: 1 } } }]))
      damaged((p) => (p.formations = [{ id: 'f', name: 'x', count: Number.NaN, transitionCounts: 4, positions: {} }]))
      damaged((p) => (p.parts = []))
      damaged((p) => (p.parts = [{ id: 'p', name: 'A', color: 'blue', sectionIds: 'all' }]))
      damaged((p) => (p.sections = []))
      damaged((p) => (p.sections = [{ id: 's', name: 'S', startCount: 'zero' }]))
      damaged((p) => (p.assignments = [] as unknown as Record<string, unknown>))
      damaged((p) => (p.assignments = { s1: { d1: 5 } }))
    })

    it('with a link that is not a real web address, or is about something that is not there', () => {
      const link = (over: Record<string, unknown>) => ({ ...richProject().resources[0], ...over })
      damaged((p) => delete p.resources)
      damaged((p) => (p.resources = 'links'))
      damaged((p) => (p.resources = [link({ url: 'javascript:alert(1)' })]))
      damaged((p) => (p.resources = [link({ url: 'data:text/html,<script>alert(1)</script>' })]))
      damaged((p) => (p.resources = [link({ kind: 'virus' })]))
      damaged((p) => (p.resources = [link({ sectionId: 'no-such-section' })]))
      damaged((p) => (p.resources = [link({ partId: 'no-such-part' })]))
      damaged((p) => (p.resources = [link({ startSec: -3 })]))
      damaged((p) => (p.resources = [link({ id: 'a' }), link({ id: 'a' })]))
    })

    it('with a note that is about something that is not there, or is not a note', () => {
      const note = (over: Record<string, unknown>) => ({ ...richProject().notes[0], ...over })
      damaged((p) => delete p.notes)
      damaged((p) => (p.notes = 'notes'))
      damaged((p) => (p.notes = [null]))
      damaged((p) => (p.notes = [note({ text: 5 })]))
      damaged((p) => (p.notes = [note({ text: 'x'.repeat(6000) })]))
      damaged((p) => (p.notes = [note({ anchor: { kind: 'section', sectionId: 'no-such-section' } })]))
      damaged((p) => (p.notes = [note({ anchor: { kind: 'count', count: -1 } })]))
      damaged((p) => (p.notes = [note({ anchor: { kind: 'count', count: 2.5 } })]))
      damaged((p) => (p.notes = [note({ anchor: 'dance' })]))
      damaged((p) => (p.notes = [note({ partId: 'no-such-part' })]))
      damaged((p) => (p.notes = [note({ id: 'a' }), note({ id: 'a' })]))
    })

    it('without ever opening the door to anything it did not check', () => {
      // a project that is fine apart from an extra field is accepted as it is (the app ignores what it does not know)
      const project = { ...structuredClone(richProject()), future: { anything: true } }
      expect(parseProjectFile(fileWith(project))).toEqual(project)
    })
  })
})

describe('projectFileName', () => {
  const day = new Date('2026-11-10T12:00:00Z')

  it('is the project name and the date', () => {
    expect(projectFileName('Spring Show', day)).toBe('Spring Show 2026-11-10.dance360.json')
  })

  it('drops characters a file system refuses, and tidies the spaces', () => {
    expect(projectFileName('  A/B: "C"?  *D*  <E>|F\\G  ', day)).toBe('AB C D EFG 2026-11-10.dance360.json')
  })

  it('keeps accents and other languages', () => {
    expect(projectFileName('Café — 春', day)).toBe('Café — 春 2026-11-10.dance360.json')
  })

  it('falls back to a plain name when nothing is left, and keeps long names short', () => {
    expect(projectFileName('', day)).toBe('Dance 2026-11-10.dance360.json')
    expect(projectFileName('///', day)).toBe('Dance 2026-11-10.dance360.json')
    expect(projectFileName('x'.repeat(200), day)).toBe(`${'x'.repeat(60)} 2026-11-10.dance360.json`)
  })
})

describe('importedCopy', () => {
  it('marks the name, and changes nothing else', () => {
    const project = richProject()
    expect(importedCopy(project)).toEqual({ ...project, name: 'Spring Show (imported)' })
  })

  it('names an unnamed project', () => {
    expect(importedCopy({ ...createEmptyProject(), name: '   ' }).name).toBe('Untitled dance (imported)')
  })

  it('leaves the original alone', () => {
    const project = richProject()
    importedCopy(project)
    expect(project.name).toBe('Spring Show')
  })
})
