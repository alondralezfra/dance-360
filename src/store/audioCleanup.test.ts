// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProject } from '../model/project'
import type { Song } from '../model/types'
import type { SyncSource } from '../persistence/repository'

vi.mock('../persistence', async () => {
  const { createMemoryAudioRepository } = await import('../persistence/memoryAudioRepository')
  const { createRepository } = await import('../persistence/createRepository')
  const { createMemoryRecordStore } = await import('../persistence/memoryRecordStore')
  return { audioRepository: createMemoryAudioRepository(), repository: createRepository(createMemoryRecordStore()) }
})

const { audioRepository, repository } = await import('../persistence')
// (the stand-in repository also implements the sync interface; tests use it to arrange state)
const sync = repository as unknown as SyncSource
const { useProject } = await import('./projectStore')
const { pruneUnusedAudio } = await import('./audioCleanup')

const song = (hash: string): Song => ({ name: `${hash}.mp3`, durationSec: 1, size: 1, mime: 'audio/mpeg', hash })
const file = () => new Blob(['x'])

beforeEach(async () => {
  for (const hash of await audioRepository.list()) await audioRepository.remove(hash)
  for (const record of await sync.listSyncRecords()) await sync.purge(record.id)
  useProject.setState({ ...createEmptyProject(), projectId: 'open', status: 'ready', song: null })
})

describe('pruneUnusedAudio', () => {
  it('removes song files no project uses, and keeps the ones that are used', async () => {
    await audioRepository.put('used', file())
    await audioRepository.put('unused', file())
    await repository.create({ ...createEmptyProject('A'), song: song('used') })

    await pruneUnusedAudio()
    expect(await audioRepository.list()).toEqual(['used'])
  })

  it('removes the cached peaks of a removed file too', async () => {
    await audioRepository.put('unused', file())
    await audioRepository.putPeaks('unused', { perSecond: 100, data: Uint8Array.from([1]) })
    await pruneUnusedAudio()
    expect(await audioRepository.getPeaks('unused')).toBeNull()
  })

  it('always keeps the open project song, even before it has been saved', async () => {
    await audioRepository.put('on-screen', file())
    useProject.setState({ song: song('on-screen') }) // not in any saved project yet
    await pruneUnusedAudio()
    expect(await audioRepository.list()).toEqual(['on-screen'])
  })

  it('does not count the song left in memory by a project that has been closed', async () => {
    await audioRepository.put('left-over', file())
    // the project was closed (and then deleted), but the store still holds its last fields
    useProject.setState({ song: song('left-over'), status: 'idle', projectId: null })
    await pruneUnusedAudio()
    expect(await audioRepository.list()).toEqual([])
  })

  it('keeps a song that a deleted project, still waiting to be synced, could bring back', async () => {
    await audioRepository.put('maybe', file())
    const id = await repository.create({ ...createEmptyProject('Gone'), song: song('maybe') })
    await sync.markSynced(id, { localRevision: 1, remoteRevision: 1 })
    await repository.remove(id)
    await pruneUnusedAudio()
    expect(await audioRepository.list()).toEqual(['maybe'])
  })

  it('clears the song of a project that was deleted outright', async () => {
    await audioRepository.put('orphan', file())
    const id = await repository.create({ ...createEmptyProject('Gone'), song: song('orphan') })
    await repository.remove(id)
    await pruneUnusedAudio()
    expect(await audioRepository.list()).toEqual([])
  })

  it('does nothing when there are no files', async () => {
    await expect(pruneUnusedAudio()).resolves.toBeUndefined()
  })

  it('never throws: a failure is logged and the files are left alone', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await audioRepository.put('x', file())
    vi.spyOn(repository, 'songHashes').mockRejectedValueOnce(new Error('storage unavailable'))
    await expect(pruneUnusedAudio()).resolves.toBeUndefined()
    expect(log).toHaveBeenCalled()
    expect(await audioRepository.list()).toEqual(['x'])
    log.mockRestore()
  })
})
