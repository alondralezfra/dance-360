import { describe, expect, it } from 'vitest'
import { createEmptyProject } from '../model/project'
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
    })

    it(`v${version} fixture keeps the user's data`, () => {
      const migrated = migrateProject(version, structuredClone(doc))
      expect(migrated.dancers).toEqual(doc.dancers)
      expect(migrated.formations.map((f) => f.positions)).toEqual(
        (doc.formations as { positions: unknown }[]).map((f) => f.positions),
      )
    })
  }

  it('migrated formations are strictly ordered by count', () => {
    for (const { version, doc } of byVersion) {
      const counts = migrateProject(version, structuredClone(doc)).formations.map((f) => f.count)
      expect(counts).toEqual([...counts].sort((a, b) => a - b))
      expect(new Set(counts).size).toBe(counts.length)
    }
  })
})
