// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestPersistentStorage } from './persistentStorage'

const useStorage = (storage: unknown) => vi.stubGlobal('navigator', { storage })
afterEach(() => vi.unstubAllGlobals())

describe('requestPersistentStorage', () => {
  it('asks the browser, and says whether it was granted', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    useStorage({ persist, persisted: vi.fn().mockResolvedValue(false) })
    expect(await requestPersistentStorage()).toBe(true)
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('says no when the browser declines', async () => {
    useStorage({ persist: vi.fn().mockResolvedValue(false), persisted: vi.fn().mockResolvedValue(false) })
    expect(await requestPersistentStorage()).toBe(false)
  })

  it('does not ask again when it already has it', async () => {
    const persist = vi.fn()
    useStorage({ persist, persisted: vi.fn().mockResolvedValue(true) })
    expect(await requestPersistentStorage()).toBe(true)
    expect(persist).not.toHaveBeenCalled()
  })

  it('works in a browser that cannot tell whether it already has it', async () => {
    useStorage({ persist: vi.fn().mockResolvedValue(true) })
    expect(await requestPersistentStorage()).toBe(true)
  })

  it('does nothing where the browser has no such feature', async () => {
    useStorage(undefined)
    expect(await requestPersistentStorage()).toBe(false)
    useStorage({})
    expect(await requestPersistentStorage()).toBe(false)
  })

  it('never throws, whatever the browser does', async () => {
    useStorage({ persist: vi.fn().mockRejectedValue(new Error('denied')), persisted: vi.fn().mockResolvedValue(false) })
    expect(await requestPersistentStorage()).toBe(false)
    useStorage({ persisted: () => Promise.reject(new Error('x')), persist: vi.fn() })
    expect(await requestPersistentStorage()).toBe(false)
  })
})
