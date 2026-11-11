import { describe, expect, it, vi } from 'vitest'
import { clickTimes } from '../model/calibration'
import { createCalibration } from './calibration'
import type { Player } from './player'

function fakePlayer() {
  let ended: (() => void) | null = null
  const player = {
    position: 0,
    playing: false,
    play: vi.fn(async () => void (player.playing = true)),
    pause: vi.fn(),
    seek: vi.fn(),
    time: () => player.position,
    onEnded: (fn: () => void) => {
      ended = fn
      return () => {}
    },
    dispose: vi.fn(() => void (player.playing = false)),
    finish: () => ended?.(),
  }
  return player
}
const asPlayer = (p: ReturnType<typeof fakePlayer>) => p as unknown as Player

describe('createCalibration', () => {
  it('plays a WAV click track made on the spot', async () => {
    const player = fakePlayer()
    const make = vi.fn((_blob: Blob) => asPlayer(player))
    await createCalibration(make).start(() => {})
    expect(player.play).toHaveBeenCalled()
    const blob = make.mock.calls[0][0]
    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBeGreaterThan(44)
  })

  it('notes where the player was at each tap, and works out the delay', async () => {
    const player = fakePlayer()
    const calibration = createCalibration(() => asPlayer(player))
    await calibration.start(() => {})
    for (const click of clickTimes()) {
      player.position = click + 0.22
      calibration.tap()
    }
    expect(calibration.taps()).toBe(clickTimes().length)
    expect(calibration.result()).toBe(220)
  })

  it('has no result until there are enough taps', async () => {
    const player = fakePlayer()
    const calibration = createCalibration(() => asPlayer(player))
    await calibration.start(() => {})
    player.position = clickTimes()[0] + 0.2
    calibration.tap()
    expect(calibration.result()).toBeNull()
  })

  it('ignores taps when nothing is playing', async () => {
    const calibration = createCalibration(() => asPlayer(fakePlayer()))
    calibration.tap() // not started
    expect(calibration.taps()).toBe(0)
    const player = fakePlayer()
    const started = createCalibration(() => asPlayer(player))
    await started.start(() => {})
    player.playing = false
    started.tap()
    expect(started.taps()).toBe(0)
  })

  it('tells the screen when the track has finished, and keeps the taps for the result', async () => {
    const player = fakePlayer()
    const onEnd = vi.fn()
    const calibration = createCalibration(() => asPlayer(player))
    await calibration.start(onEnd)
    for (const click of clickTimes()) {
      player.position = click + 0.1
      calibration.tap()
    }
    player.finish()
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(calibration.result()).toBe(100)
  })

  it('stopping lets go of the player and forgets the taps', async () => {
    const player = fakePlayer()
    const calibration = createCalibration(() => asPlayer(player))
    await calibration.start(() => {})
    player.position = 1.2
    calibration.tap()
    calibration.stop()
    expect(player.dispose).toHaveBeenCalled()
    expect(calibration.taps()).toBe(0)
  })

  it('starting again starts fresh', async () => {
    const first = fakePlayer()
    const second = fakePlayer()
    const players = [first, second]
    const calibration = createCalibration(() => asPlayer(players.shift()!))
    await calibration.start(() => {})
    first.position = 1.2
    calibration.tap()
    await calibration.start(() => {})
    expect(first.dispose).toHaveBeenCalled()
    expect(calibration.taps()).toBe(0)
  })

  it('lets go and passes on the error when the browser refuses to play', async () => {
    const player = fakePlayer()
    player.play.mockRejectedValue(new DOMException('no', 'NotAllowedError'))
    const calibration = createCalibration(() => asPlayer(player))
    await expect(calibration.start(() => {})).rejects.toThrow()
    expect(player.dispose).toHaveBeenCalled()
    calibration.tap()
    expect(calibration.taps()).toBe(0)
  })
})
