import { describe, expect, it } from 'vitest'
import { createEmptyProject } from '../model/project'
import { problemWithResources } from '../model/resources'
import { CURRENT_VERSION, migrateProject } from './migrations'

// Regression guard for saved data. fixtures/vN.json is a FROZEN example of what
// version N of the app saved. Every one of them must still load and come out
// with the current shape. If you change the Project type, this fails until you
// bump CURRENT_VERSION, add a migration, and add fixtures/v<new>.json.

const fixtures = import.meta.glob('./fixtures/v*.json', { eager: true, import: 'default' }) as Record<
  string,
  Record<string, unknown>
>
const byVersion = Object.entries(fixtures)
  .map(([path, doc]) => ({ version: Number(path.match(/v(\d+)\.json$/)![1]), doc }))
  .sort((a, b) => a.version - b.version)

const keys = (o: object) => Object.keys(o).sort()

describe('saved-data fixtures', () => {
  it('has a fixture for every data version up to the current one', () => {
    expect(byVersion.map((f) => f.version)).toEqual(Array.from({ length: CURRENT_VERSION + 1 }, (_, i) => i))
  })

  for (const { version, doc } of byVersion) {
    it(`v${version} fixture migrates to the current shape`, () => {
      const migrated = migrateProject(version, structuredClone(doc))
      const fresh = createEmptyProject()

      expect(keys(migrated)).toEqual(keys(fresh))
      expect(keys(migrated.stage)).toEqual(keys(fresh.stage))
      expect(keys(migrated.tempo)).toEqual(keys(fresh.tempo))
      expect(keys(migrated.formations[0])).toEqual(keys(fresh.formations[0]))
      expect(keys(migrated.dancers[0])).toEqual(['id', 'name'])
      expect(keys(migrated.parts[0])).toEqual(keys(fresh.parts[0]))
      expect(keys(migrated.sections[0])).toEqual(keys(fresh.sections[0]))
      expect(typeof migrated.assignments).toBe('object')
    })

    it(`v${version} fixture keeps the user's data`, () => {
      const migrated = migrateProject(version, structuredClone(doc))
      expect(migrated.dancers).toEqual(doc.dancers)
      expect(migrated.formations.map((f) => f.positions)).toEqual(
        (doc.formations as { positions: unknown }[]).map((f) => f.positions),
      )
    })
  }

  it('migrated sections are valid: first at 0, strictly increasing, at least one', () => {
    for (const { version, doc } of byVersion) {
      const starts = migrateProject(version, structuredClone(doc)).sections.map((s) => s.startCount)
      expect(starts.length).toBeGreaterThan(0)
      expect(starts[0]).toBe(0)
      expect(starts).toEqual([...starts].sort((a, b) => a - b))
      expect(new Set(starts).size).toBe(starts.length)
    }
  })

  it('every migrated part applies to all sections (null) or to sections that exist', () => {
    for (const { version, doc } of byVersion) {
      const p = migrateProject(version, structuredClone(doc))
      const sections = new Set(p.sections.map((s) => s.id))
      for (const part of p.parts) {
        expect(part.sectionIds === null || part.sectionIds.every((id) => sections.has(id))).toBe(true)
      }
      // Projects saved before part scoping existed keep every part applying everywhere.
      if (version < 3) expect(p.parts.every((part) => part.sectionIds === null)).toBe(true)
    }
  })

  it('every migrated link is well formed and about a section and part that exist; older projects have none', () => {
    for (const { version, doc } of byVersion) {
      const p = migrateProject(version, structuredClone(doc))
      expect(problemWithResources(p), `v${version}`).toBeNull()
      if (version < 5) expect(p.resources).toEqual([])
      else expect(p.resources).toEqual(doc.resources)
    }
  })

  it('every migrated assignment points at a real dancer, section and part', () => {
    for (const { version, doc } of byVersion) {
      const p = migrateProject(version, structuredClone(doc))
      const dancers = new Set(p.dancers.map((d) => d.id))
      const sections = new Set(p.sections.map((s) => s.id))
      const parts = new Set(p.parts.map((x) => x.id))
      for (const [sectionId, byDancer] of Object.entries(p.assignments)) {
        expect(sections.has(sectionId)).toBe(true)
        for (const [dancerId, partId] of Object.entries(byDancer)) {
          expect(dancers.has(dancerId)).toBe(true)
          expect(parts.has(partId)).toBe(true)
        }
      }
    }
  })

  it('migrated formations are strictly ordered by count', () => {
    for (const { version, doc } of byVersion) {
      const counts = migrateProject(version, structuredClone(doc)).formations.map((f) => f.count)
      expect(counts).toEqual([...counts].sort((a, b) => a - b))
      expect(new Set(counts).size).toBe(counts.length)
    }
  })
})
