// @vitest-environment node
// (Node's environment, not jsdom: jsdom's Blob can't be copied by the fake database, though real browsers can.)
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { describe, expect, it, vi } from 'vitest'
import { describeAudioRepositoryContract } from '../test/audioRepositoryContract'
import { createIndexedDbAudioRepository } from './indexedDbAudioRepository'
import { createMemoryAudioRepository } from './memoryAudioRepository'

// The same behaviour is required of every song store.
describeAudioRepositoryContract('the in-memory audio repository', () => createMemoryAudioRepository())
describeAudioRepositoryContract('the IndexedDB audio repository', () =>
  createIndexedDbAudioRepository(new IDBFactory(), 'test-audio'),
)

describe('IndexedDB specifics', () => {
  it('keeps files across a new repository over the same database (a reload)', async () => {
    const factory = new IDBFactory()
    await createIndexedDbAudioRepository(factory, 'db').put('h', new Blob(['kept']))
    const reopened = createIndexedDbAudioRepository(factory, 'db')
    expect(await (await reopened.get('h'))!.text()).toBe('kept')
  })

  it('keeps separate databases separate', async () => {
    const factory = new IDBFactory()
    await createIndexedDbAudioRepository(factory, 'one').put('h', new Blob(['x']))
    expect(await createIndexedDbAudioRepository(factory, 'two').has('h')).toBe(false)
  })

  it('asks the browser to keep the songs, once, and carries on if it refuses or cannot', async () => {
    const persist = vi.fn().mockRejectedValue(new Error('no'))
    vi.stubGlobal('navigator', { storage: { persist } })
    try {
      const repo = createIndexedDbAudioRepository(new IDBFactory(), 'persist-test')
      await repo.put('a', new Blob(['a']))
      await repo.put('b', new Blob(['b']))
      expect(persist).toHaveBeenCalledTimes(1)
      expect(await repo.has('b')).toBe(true)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('works where the browser has no storage manager at all', async () => {
    vi.stubGlobal('navigator', {})
    try {
      const repo = createIndexedDbAudioRepository(new IDBFactory(), 'no-manager')
      await expect(repo.put('a', new Blob(['a']))).resolves.toBeUndefined()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('reports a failure to open the database, and tries again next time', async () => {
    let fail = true
    const factory = new IDBFactory()
    const real = factory.open.bind(factory)
    factory.open = ((dbName: string, version?: number) => {
      if (fail) {
        const request = real(dbName, version)
        // simulate a browser that refuses to open it (private mode, blocked storage)
        queueMicrotask(() => {
          Object.defineProperty(request, 'error', { value: new DOMException('blocked', 'SecurityError') })
          request.onerror?.(new Event('error'))
        })
        return request
      }
      return real(dbName, version)
    }) as typeof factory.open

    const repo = createIndexedDbAudioRepository(factory, 'flaky')
    await expect(repo.has('x')).rejects.toBeTruthy()
    fail = false
    await expect(repo.has('x')).resolves.toBe(false)
  })

  it('rejects a save the database cannot complete (for example, out of space)', async () => {
    const factory = new IDBFactory()
    const repo = createIndexedDbAudioRepository(factory, 'full')
    await repo.put('warm-up', new Blob(['x'])) // open the database first
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('Not enough space', 'QuotaExceededError')
    }
    try {
      await expect(repo.put('big', new Blob(['y']))).rejects.toMatchObject({ name: 'QuotaExceededError' })
    } finally {
      IDBObjectStore.prototype.put = original
    }
  })
})
