// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProject } from '../model/project'
import { CURRENT_VERSION } from './migrations'
import { localStorageRepository as repo } from './localStorageRepository'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

const legacyV0 = {
  version: 0,
  state: {
    name: 'Old dance',
    stage: { width: 40, depth: 24 },
    dancers: [{ id: 'd1', name: 'Maya' }],
    formations: [{ id: 'f1', name: 'Opening', positions: { d1: { x: 1, y: 2 } } }],
    currentFormationId: 'f1', // UI state the old format mixed in; must not leak into the project
  },
}

describe('projects', () => {
  it('round-trips a project through create and load', async () => {
    const project = createEmptyProject('Spring Showcase')
    const id = await repo.create(project)
    expect(await repo.load(id)).toEqual(project)
  })

  it('writes a versioned envelope', async () => {
    const id = await repo.create(createEmptyProject())
    const raw = JSON.parse(localStorage.getItem(`dance360:project:${id}`)!)
    expect(raw.version).toBe(CURRENT_VERSION)
    expect(typeof raw.updatedAt).toBe('number')
  })

  it('resolves to null for an unknown id', async () => {
    expect(await repo.load('nope')).toBeNull()
  })

  it('save overwrites, and list reflects the new name', async () => {
    const id = await repo.create(createEmptyProject('Before'))
    await repo.save(id, createEmptyProject('After'))
    expect((await repo.list()).map((p) => p.name)).toEqual(['After'])
  })

  it('remove deletes the project', async () => {
    const id = await repo.create(createEmptyProject())
    await repo.remove(id)
    expect(await repo.load(id)).toBeNull()
    expect(await repo.list()).toEqual([])
  })

  it('lists the most recently saved first', async () => {
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValue(1000)
    const older = await repo.create(createEmptyProject('Older'))
    now.mockReturnValue(2000)
    await repo.create(createEmptyProject('Newer'))
    expect((await repo.list()).map((p) => p.name)).toEqual(['Newer', 'Older'])
    now.mockReturnValue(3000)
    await repo.save(older, createEmptyProject('Older'))
    expect((await repo.list()).map((p) => p.name)).toEqual(['Older', 'Newer'])
  })

  it('ignores unrelated localStorage keys', async () => {
    localStorage.setItem('something-else', '{}')
    await repo.create(createEmptyProject('Mine'))
    expect(await repo.list()).toHaveLength(1)
  })

  it('skips an unreadable entry instead of hiding every project', async () => {
    localStorage.setItem('dance360:project:broken', '{not json')
    await repo.create(createEmptyProject('Good'))
    expect((await repo.list()).map((p) => p.name)).toEqual(['Good'])
  })

  it('refuses to open a project saved by a newer app version', async () => {
    localStorage.setItem(
      'dance360:project:future',
      JSON.stringify({ version: CURRENT_VERSION + 1, updatedAt: 1, project: {} }),
    )
    await expect(repo.load('future')).rejects.toThrow(/newer version/)
  })

  it('migrates an older saved version when loading', async () => {
    localStorage.setItem(
      'dance360:project:old',
      JSON.stringify({ version: 0, updatedAt: 1, project: legacyV0.state }),
    )
    const project = await repo.load('old')
    expect(project?.tempo.bpm).toBeGreaterThan(0)
    expect(project?.formations[0].count).toBe(0)
  })
})

describe('legacy import (the original single-project prototype)', () => {
  it('moves the old save into a real project and removes the old key', async () => {
    localStorage.setItem('dance360-project', JSON.stringify(legacyV0))
    const list = await repo.list()
    expect(list.map((p) => p.name)).toEqual(['Old dance'])
    expect(localStorage.getItem('dance360-project')).toBeNull()

    const project = await repo.load(list[0].id)
    expect(project?.dancers).toEqual(legacyV0.state.dancers)
    expect(project?.formations[0].transitionCounts).toBeGreaterThan(0)
    expect('currentFormationId' in (project as object)).toBe(false)
  })

  it('imports only once', async () => {
    localStorage.setItem('dance360-project', JSON.stringify(legacyV0))
    await repo.list()
    expect(await repo.list()).toHaveLength(1)
  })

  it('leaves unreadable legacy data untouched rather than losing it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem('dance360-project', '{corrupt')
    expect(await repo.list()).toEqual([])
    expect(localStorage.getItem('dance360-project')).toBe('{corrupt')
  })

  it('treats a legacy save with no version number as version 0', async () => {
    localStorage.setItem('dance360-project', JSON.stringify({ state: legacyV0.state }))
    const [only] = await repo.list()
    expect(only.name).toBe('Old dance')
  })

  it('clears a legacy entry that holds no project', async () => {
    localStorage.setItem('dance360-project', JSON.stringify({ version: 0 }))
    expect(await repo.list()).toEqual([])
    expect(localStorage.getItem('dance360-project')).toBeNull()
  })

  it('labels a project with no name "Untitled" in the list', async () => {
    localStorage.setItem(
      'dance360:project:nameless',
      JSON.stringify({ version: CURRENT_VERSION, updatedAt: 5, project: {} }),
    )
    expect((await repo.list())[0].name).toBe('Untitled')
  })

  it('does nothing when there is no legacy data', async () => {
    expect(await repo.list()).toEqual([])
  })
})
