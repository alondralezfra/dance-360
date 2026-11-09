import { beforeEach, describe, expect, it } from 'vitest'
import type { Peaks } from '../model/peaks'
import type { AudioRepository } from '../persistence/audioRepository'

const file = (text: string) => new Blob([text], { type: 'audio/mpeg' })
const text = (blob: Blob | null) => blob?.text()
const peaks = (...levels: number[]): Peaks => ({ perSecond: 100, data: Uint8Array.from(levels) })

/** What every song store must do, whatever it stores into. Pass a factory that returns a fresh, empty one. */
export function describeAudioRepositoryContract(name: string, make: () => AudioRepository | Promise<AudioRepository>) {
  describe(`${name} satisfies the audio repository contract`, () => {
    let repo: AudioRepository
    beforeEach(async () => {
      repo = await make()
    })

    it('keeps a file under its hash and gives the same bytes back', async () => {
      await repo.put('h1', file('first song'))
      expect(await text(await repo.get('h1'))).toBe('first song')
      expect(await repo.has('h1')).toBe(true)
    })

    it('knows nothing about a hash it was never given', async () => {
      expect(await repo.get('nope')).toBeNull()
      expect(await repo.has('nope')).toBe(false)
      expect(await repo.getPeaks('nope')).toBeNull()
    })

    it('keeps different files apart, and putting the same hash again replaces the file', async () => {
      await repo.put('a', file('A'))
      await repo.put('b', file('B'))
      expect(await text(await repo.get('a'))).toBe('A')
      await repo.put('a', file('A2'))
      expect(await text(await repo.get('a'))).toBe('A2')
      expect((await repo.list()).sort()).toEqual(['a', 'b'])
    })

    it('lists nothing when empty', async () => {
      expect(await repo.list()).toEqual([])
    })

    it('removing a file removes its peaks too, and leaves others alone', async () => {
      await repo.put('a', file('A'))
      await repo.putPeaks('a', peaks(1, 2, 3))
      await repo.put('b', file('B'))
      await repo.putPeaks('b', peaks(9))

      await repo.remove('a')
      expect(await repo.has('a')).toBe(false)
      expect(await repo.getPeaks('a')).toBeNull()
      expect(await repo.has('b')).toBe(true)
      expect(Array.from((await repo.getPeaks('b'))!.data)).toEqual([9])
    })

    it('removing an unknown hash is harmless', async () => {
      await expect(repo.remove('nope')).resolves.toBeUndefined()
    })

    it('round-trips peaks exactly', async () => {
      const original = peaks(0, 17, 255, 128)
      await repo.putPeaks('h', original)
      const back = (await repo.getPeaks('h'))!
      expect(back.perSecond).toBe(100)
      expect(Array.from(back.data)).toEqual([0, 17, 255, 128])
    })

    it('does not share memory with the peaks it was given', async () => {
      const original = peaks(1, 2, 3)
      await repo.putPeaks('h', original)
      original.data[0] = 99
      expect(Array.from((await repo.getPeaks('h'))!.data)).toEqual([1, 2, 3])
    })

    it('can hold peaks before or without the file (they are only a cache)', async () => {
      await repo.putPeaks('lonely', peaks(5))
      expect(await repo.has('lonely')).toBe(false)
      expect(await repo.list()).toEqual([])
      expect((await repo.getPeaks('lonely'))!.data[0]).toBe(5)
    })
  })
}
