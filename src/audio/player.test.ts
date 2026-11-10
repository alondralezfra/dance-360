import { describe, expect, it, vi } from 'vitest'
import { createPlayer, type MediaLike } from './player'

/** A stand-in for an audio element whose position and state the test controls. */
function fakeMedia(over: Partial<MediaLike> = {}) {
  const listeners = new Set<() => void>()
  const media = {
    currentTime: 0,
    duration: 100,
    paused: true,
    ended: false,
    play: vi.fn(async () => {
      media.paused = false
    }),
    pause: vi.fn(() => {
      media.paused = true
    }),
    addEventListener: vi.fn((_: 'ended', fn: () => void) => void listeners.add(fn)),
    removeEventListener: vi.fn((_: 'ended', fn: () => void) => void listeners.delete(fn)),
    ...over,
  }
  return { media, finish: () => listeners.forEach((fn) => fn()), listeners }
}

function setup(over: Partial<MediaLike> = {}) {
  const { media, finish, listeners } = fakeMedia(over)
  let clock = 1000
  const onDispose = vi.fn()
  const player = createPlayer(media, () => clock, onDispose)
  return { media, finish, listeners, player, onDispose, advance: (ms: number) => (clock += ms) }
}

describe('createPlayer', () => {
  describe('playing and pausing', () => {
    it('plays through the audio element, and reports that it is playing', async () => {
      const { player, media } = setup()
      expect(player.playing).toBe(false)
      await player.play()
      expect(media.play).toHaveBeenCalledTimes(1)
      expect(player.playing).toBe(true)
    })

    it('pauses', async () => {
      const { player, media } = setup()
      await player.play()
      player.pause()
      expect(media.pause).toHaveBeenCalled()
      expect(player.playing).toBe(false)
    })

    it('passes on a refusal from the browser (for example, it wants a click first)', async () => {
      const { player } = setup({ play: vi.fn().mockRejectedValue(new DOMException('no', 'NotAllowedError')) })
      await expect(player.play()).rejects.toMatchObject({ name: 'NotAllowedError' })
      expect(player.playing).toBe(false)
    })

    it('is not "playing" once the song has ended', async () => {
      const { player, media } = setup()
      await player.play()
      media.ended = true
      media.paused = true
      expect(player.playing).toBe(false)
    })
  })

  describe('where the song is', () => {
    it('is exactly the browser position while paused', () => {
      const { player, media, advance } = setup()
      media.currentTime = 12.34
      advance(5000)
      expect(player.time()).toBe(12.34)
    })

    it('moves smoothly between the browser\'s coarse updates while playing', async () => {
      const { player, media, advance } = setup()
      await player.play()
      media.currentTime = 10
      expect(player.time()).toBe(10)
      advance(50)
      expect(player.time()).toBeCloseTo(10.05) // the browser still says 10
      advance(50)
      expect(player.time()).toBeCloseTo(10.1)
      media.currentTime = 10.12 // the next report arrives, a touch ahead
      expect(player.time()).toBe(10.12)
      advance(30)
      expect(player.time()).toBeCloseTo(10.15)
    })

    it('does not run on without the sound if the browser stops reporting (buffering)', async () => {
      const { player, media, advance } = setup()
      await player.play()
      media.currentTime = 20
      player.time()
      advance(5000)
      expect(player.time()).toBeCloseTo(20.25) // carried forward at most a quarter of a second
    })

    it('never goes past the end of the song', async () => {
      const { player, media, advance } = setup({ duration: 30 })
      await player.play()
      media.currentTime = 29.95
      player.time()
      advance(200)
      expect(player.time()).toBe(30)
    })

    it('copes with a song whose length is not known yet', async () => {
      const { player, media, advance } = setup({ duration: NaN })
      await player.play()
      media.currentTime = 4
      player.time()
      advance(100)
      expect(player.time()).toBeCloseTo(4.1)
    })
  })

  describe('seeking', () => {
    it('jumps to the moment asked for, and the time reads from there', () => {
      const { player, media } = setup()
      player.seek(42.5)
      expect(media.currentTime).toBe(42.5)
      expect(player.time()).toBe(42.5)
    })

    it('stays inside the song', () => {
      const { player, media } = setup({ duration: 60 })
      player.seek(-5)
      expect(media.currentTime).toBe(0)
      player.seek(500)
      expect(media.currentTime).toBe(60)
    })

    it('does not carry forward time from before the jump', async () => {
      const { player, media, advance } = setup()
      await player.play()
      media.currentTime = 10
      player.time()
      advance(200)
      player.seek(50)
      expect(player.time()).toBe(50) // not 50.2
    })
  })

  describe('the end of the song', () => {
    it('tells listeners, until they stop listening', () => {
      const { player, finish } = setup()
      const heard = vi.fn()
      const stop = player.onEnded(heard)
      finish()
      expect(heard).toHaveBeenCalledTimes(1)
      stop()
      stop() // harmless twice
      finish()
      expect(heard).toHaveBeenCalledTimes(1)
    })
  })

  describe('dispose', () => {
    it('stops playing, stops listening, and lets go of the file', () => {
      const { player, media, listeners, onDispose, finish } = setup()
      const heard = vi.fn()
      player.onEnded(heard)
      player.dispose()
      expect(media.pause).toHaveBeenCalled()
      expect(onDispose).toHaveBeenCalledTimes(1)
      expect(listeners.size).toBe(0)
      finish()
      expect(heard).not.toHaveBeenCalled()
    })
  })
})
