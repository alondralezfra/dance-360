// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../model/project'
import { describeRepositoryContract } from '../test/repositoryContract'
import { createRepository } from './createRepository'
import { localStorageRecordStore } from './localStorageRecordStore'
import { localStorageRepository } from './localStorageRepository'
import { CURRENT_VERSION } from './migrations'
import { createMemoryRecordStore } from './memoryRecordStore'

// The same behaviour is required of every repository, whatever it stores into.
describeRepositoryContract('the in-memory repository', () => createRepository(createMemoryRecordStore()))
describeRepositoryContract('the localStorage repository', () => {
  localStorage.clear()
  return localStorageRepository
})

describe('localStorage specifics', () => {
  beforeEach(() => localStorage.clear())

  it('keeps sync bookkeeping in the envelope, beside the document (not inside it)', async () => {
    const id = await localStorageRepository.create(createEmptyProject('Mine'))
    const raw = JSON.parse(localStorage.getItem(`dance360:project:${id}`)!)
    expect(raw.version).toBe(CURRENT_VERSION)
    expect(raw.sync).toEqual({ localRevision: 1, remoteRevision: null, dirty: true, deleted: false })
    expect(Object.keys(raw.project)).not.toContain('sync')
  })

  it('reads a project stored before sync existed as never synced and still saves it', async () => {
    const project = createEmptyProject('Old save')
    localStorage.setItem(
      'dance360:project:old',
      JSON.stringify({ version: CURRENT_VERSION, updatedAt: 1, project }),
    )
    const [record] = await localStorageRepository.listSyncRecords()
    expect(record).toMatchObject({ id: 'old', remoteRevision: null, dirty: true, deleted: false })

    await localStorageRepository.save('old', createEmptyProject('Old save, edited'))
    expect(JSON.parse(localStorage.getItem('dance360:project:old')!).sync.localRevision).toBe(1)
  })

  it('a corrupt entry does not stop a save over it, and is left out of the sync list', async () => {
    localStorage.setItem('dance360:project:broken', '{not json')
    expect(await localStorageRepository.listSyncRecords()).toEqual([])
    await localStorageRepository.save('broken', createEmptyProject('Rescued'))
    expect((await localStorageRepository.load('broken'))?.name).toBe('Rescued')
  })

  it('a project from a newer app version is left out of the sync list instead of breaking it', async () => {
    localStorage.setItem(
      'dance360:project:future',
      JSON.stringify({ version: CURRENT_VERSION + 1, updatedAt: 1, project: {} }),
    )
    await localStorageRepository.create(createEmptyProject('Fine'))
    expect((await localStorageRepository.listSyncRecords()).map((r) => r.project.name)).toEqual(['Fine'])
  })

  it('the storage adapter lists only project keys', async () => {
    localStorage.setItem('something-else', '{}')
    await localStorageRecordStore.put('a', { version: 1, updatedAt: 1, project: {} })
    expect(await localStorageRecordStore.ids()).toEqual(['a'])
  })
})
