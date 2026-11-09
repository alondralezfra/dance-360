import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../model/project'
import type { ProjectRepository, SyncSource } from '../persistence/repository'

type Repo = ProjectRepository & SyncSource

/**
 * What every project repository must do, whatever it stores into: browser
 * storage, memory, and later the database behind cloud sync. Run it from a test
 * file with a factory that returns a fresh, empty repository.
 */
export function describeRepositoryContract(name: string, make: () => Repo | Promise<Repo>) {
  describe(`${name} satisfies the repository contract`, () => {
    let repo: Repo
    beforeEach(async () => {
      repo = await make()
    })

    describe('projects', () => {
      it('round-trips a project through create and load', async () => {
        const project = createEmptyProject('Spring Showcase')
        const id = await repo.create(project)
        expect(await repo.load(id)).toEqual(project)
      })

      it('gives every created project its own id', async () => {
        const a = await repo.create(createEmptyProject('A'))
        const b = await repo.create(createEmptyProject('A'))
        expect(a).not.toBe(b)
      })

      it('resolves to null for an unknown id', async () => {
        expect(await repo.load('nope')).toBeNull()
      })

      it('save overwrites, and list reflects the new name', async () => {
        const id = await repo.create(createEmptyProject('Before'))
        const after = createEmptyProject('After')
        await repo.save(id, after)
        expect(await repo.load(id)).toEqual(after)
        expect((await repo.list()).map((p) => p.name)).toEqual(['After'])
      })

      it('lists the most recently saved first', async () => {
        const older = await repo.create(createEmptyProject('Older'))
        await new Promise((r) => setTimeout(r, 5))
        await repo.create(createEmptyProject('Newer'))
        expect((await repo.list()).map((p) => p.name)).toEqual(['Newer', 'Older'])
        await new Promise((r) => setTimeout(r, 5))
        await repo.save(older, createEmptyProject('Older'))
        expect((await repo.list()).map((p) => p.name)).toEqual(['Older', 'Newer'])
      })

      it('does not share state between the stored copy and the one that was saved', async () => {
        const project = createEmptyProject('Mine')
        const id = await repo.create(project)
        project.name = 'Changed afterwards'
        expect((await repo.load(id))?.name).toBe('Mine')
      })
    })

    describe('deleting', () => {
      it('hides a deleted project from load and list', async () => {
        const id = await repo.create(createEmptyProject())
        await repo.remove(id)
        expect(await repo.load(id)).toBeNull()
        expect(await repo.list()).toEqual([])
      })

      it('deleting an unknown project is harmless', async () => {
        await expect(repo.remove('nope')).resolves.toBeUndefined()
      })

      it('refuses a late save of a deleted project instead of bringing it back', async () => {
        const id = await repo.create(createEmptyProject())
        await repo.markSynced(id, { localRevision: 1, remoteRevision: 1 }) // the cloud knows it, so a tombstone is kept
        await repo.remove(id)
        await expect(repo.save(id, createEmptyProject('Zombie'))).rejects.toThrow(/deleted/)
        expect(await repo.list()).toEqual([])
      })
    })

    describe('sync bookkeeping', () => {
      it('a new project is dirty, has never synced, and is listed for sync', async () => {
        const project = createEmptyProject('New')
        const id = await repo.create(project)
        const [record] = await repo.listSyncRecords()
        expect(record).toMatchObject({ id, remoteRevision: null, dirty: true, deleted: false })
        expect(record.project).toEqual(project)
        expect(record.localRevision).toBeGreaterThan(0)
      })

      it('every save raises the local revision', async () => {
        const id = await repo.create(createEmptyProject())
        const first = (await repo.listSyncRecords())[0].localRevision
        await repo.save(id, createEmptyProject('Again'))
        expect((await repo.listSyncRecords())[0].localRevision).toBeGreaterThan(first)
      })

      it('markSynced makes the project clean and remembers the cloud revision', async () => {
        const id = await repo.create(createEmptyProject())
        const { localRevision } = (await repo.listSyncRecords())[0]
        await repo.markSynced(id, { localRevision, remoteRevision: 4 })
        expect((await repo.listSyncRecords())[0]).toMatchObject({ dirty: false, remoteRevision: 4 })
      })

      it('a save made while an upload was in flight stays dirty', async () => {
        const id = await repo.create(createEmptyProject('v1'))
        const uploaded = (await repo.listSyncRecords())[0] // the upload starts with this
        await repo.save(id, createEmptyProject('v2')) // the user keeps working
        await repo.markSynced(id, { localRevision: uploaded.localRevision, remoteRevision: 2 })
        const [after] = await repo.listSyncRecords()
        expect(after).toMatchObject({ dirty: true, remoteRevision: 2 })
        expect(after.project.name).toBe('v2')
      })

      it('saving a synced project makes it dirty again', async () => {
        const id = await repo.create(createEmptyProject())
        await repo.markSynced(id, { localRevision: (await repo.listSyncRecords())[0].localRevision, remoteRevision: 1 })
        await repo.save(id, createEmptyProject('Edited'))
        expect((await repo.listSyncRecords())[0]).toMatchObject({ dirty: true, remoteRevision: 1 })
      })

      it('deleting a project the cloud never saw removes it entirely', async () => {
        const id = await repo.create(createEmptyProject())
        await repo.remove(id)
        expect(await repo.listSyncRecords()).toEqual([])
      })

      it('deleting a synced project leaves a tombstone until the cloud is told', async () => {
        const id = await repo.create(createEmptyProject())
        await repo.markSynced(id, { localRevision: (await repo.listSyncRecords())[0].localRevision, remoteRevision: 3 })
        await repo.remove(id)

        const [tombstone] = await repo.listSyncRecords()
        expect(tombstone).toMatchObject({ id, deleted: true, dirty: true, remoteRevision: 3 })

        await repo.markSynced(id, { localRevision: tombstone.localRevision, remoteRevision: 4 })
        expect(await repo.listSyncRecords()).toEqual([])
      })

      it('markSynced for an unknown project is ignored', async () => {
        await expect(repo.markSynced('nope', { localRevision: 1, remoteRevision: 1 })).resolves.toBeUndefined()
        expect(await repo.listSyncRecords()).toEqual([])
      })

      it('applyRemote creates a project that only exists in the cloud, already in step with it', async () => {
        const project = createEmptyProject('From the cloud')
        await repo.applyRemote('cloud-1', project, 6)
        expect(await repo.load('cloud-1')).toEqual(project)
        expect((await repo.listSyncRecords())[0]).toMatchObject({
          id: 'cloud-1',
          dirty: false,
          remoteRevision: 6,
          deleted: false,
        })
        expect((await repo.list()).map((p) => p.name)).toEqual(['From the cloud'])
      })

      it('applyRemote replaces local changes ("use theirs") and brings back a deleted project', async () => {
        const id = await repo.create(createEmptyProject('Mine'))
        await repo.markSynced(id, { localRevision: (await repo.listSyncRecords())[0].localRevision, remoteRevision: 1 })
        await repo.save(id, createEmptyProject('Mine, edited'))
        const theirs = createEmptyProject('Theirs')
        await repo.applyRemote(id, theirs, 2)
        expect(await repo.load(id)).toEqual(theirs)
        expect((await repo.listSyncRecords())[0]).toMatchObject({ dirty: false, remoteRevision: 2 })

        await repo.remove(id)
        await repo.applyRemote(id, createEmptyProject('Restored'), 5)
        expect((await repo.list()).map((p) => p.name)).toEqual(['Restored'])
      })

      it('purge removes a project completely, and unknown ids are ignored', async () => {
        const id = await repo.create(createEmptyProject())
        await repo.purge(id)
        expect(await repo.load(id)).toBeNull()
        expect(await repo.listSyncRecords()).toEqual([])
        await expect(repo.purge('nope')).resolves.toBeUndefined()
      })
    })
  })
}
