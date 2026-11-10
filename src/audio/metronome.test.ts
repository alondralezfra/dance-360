import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clicksBetween } from '../model/metronome'
import { createMetronome, type AudioContextLike, type ClickSource } from './metronome'

const tempo = { bpm: 120, startOffsetSec: 0, changes: [] } // a click every half second

interface Sound {
  when: number
  hz: number
}

function fakeContext() {
  const sounds: Sound[] = []
  const state = { currentTime: 100, closed: false, resumed: 0 }
  const context: AudioContextLike = {
    get currentTime() {
      return state.currentTime
    },
    destination: {},
    resume: async () => void state.resumed++,
    close: async () => void (state.closed = true),
    createOscillator: () => {
      const oscillator = {
        type: '',
        frequency: { value: 0 },
        connect: () => {},
        start: (when: number) => sounds.push({ when, hz: oscillator.frequency.value }),
        stop: vi.fn(),
      }
      return oscillator
    },
    createGain: () => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: () => {} }),
  }
  return { context, sounds, state }
}

/** A song position the test controls, with the real click maths. */
function source(initial = 0) {
  const position = { sec: initial }
  const source: ClickSource = { time: () => position.sec, clicks: (from, to) => clicksBetween(tempo, from, to) }
  return { source, position }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createMetronome', () => {
  it('sounds each click once, at the right moment on the audio clock', () => {
    const { context, sounds, state } = fakeContext()
    const { source: src, position } = source(0)
    createMetronome(() => context).start(src)

    // play along for two seconds, a tick at a time
    for (let t = 0; t < 2000; t += 25) {
      position.sec = t / 1000
      state.currentTime = 100 + t / 1000
      vi.advanceTimersByTime(25)
    }
    // clicks at 0, 0.5, 1, 1.5 (and 2 is scheduled just ahead); none twice
    const whens = sounds.map((s) => Math.round((s.when - 100) * 1000) / 1000)
    expect(whens.slice(0, 4)).toEqual([0, 0.5, 1, 1.5])
    expect(new Set(whens).size).toBe(whens.length)
  })

  it('schedules clicks ahead of the song position, not behind it', () => {
    const { context, sounds } = fakeContext()
    const { source: src, position } = source(0.4)
    createMetronome(() => context).start(src)
    position.sec = 0.4
    vi.advanceTimersByTime(25) // looks 0.15 s ahead: 0.4 to 0.55, so the click at 0.5
    expect(sounds).toHaveLength(1)
    expect(sounds[0].when).toBeCloseTo(100 + 0.1) // 0.1 s from now
  })

  it('makes the first count of each set higher than the rest', () => {
    const { context, sounds, state } = fakeContext()
    const { source: src, position } = source(0)
    createMetronome(() => context).start(src)
    for (let t = 0; t < 4600; t += 25) {
      position.sec = t / 1000
      state.currentTime = 100 + t / 1000
      vi.advanceTimersByTime(25)
    }
    const hz = sounds.map((s) => s.hz)
    expect(hz[0]).toBe(1600) // count 0 starts a set
    expect(hz.slice(1, 8).every((h) => h === 1000)).toBe(true)
    expect(hz[8]).toBe(1600) // the next set, at 4 s
  })

  it('stops clicking when stopped, and clicks again from the new place when restarted (a jump)', () => {
    const { context, sounds } = fakeContext()
    const metronome = createMetronome(() => context)
    const { source: src, position } = source(0)
    metronome.start(src)
    position.sec = 0
    vi.advanceTimersByTime(25)
    const afterFirst = sounds.length
    metronome.stop()
    position.sec = 5
    vi.advanceTimersByTime(500)
    expect(sounds).toHaveLength(afterFirst) // silent while stopped

    position.sec = 30 // jumped far ahead
    metronome.start(src)
    vi.advanceTimersByTime(25)
    expect(sounds.length).toBeGreaterThan(afterFirst)
    expect(sounds.at(-1)!.when).toBeCloseTo(100) // the click at 30.0 s, now
  })

  it('starting twice does not double the clicks', () => {
    const { context, sounds } = fakeContext()
    const metronome = createMetronome(() => context)
    const { source: src } = source(0)
    metronome.start(src)
    metronome.start(src)
    vi.advanceTimersByTime(25)
    expect(sounds).toHaveLength(1)
  })

  it('skips clicks it is too late to sound after the page stalls, instead of firing them all at once', () => {
    const { context, sounds } = fakeContext()
    const { source: src, position } = source(0)
    createMetronome(() => context).start(src)
    position.sec = 10 // the page froze for ten seconds
    vi.advanceTimersByTime(25)
    // only what is still ahead (10.0 to 10.15 and a hair behind), not twenty missed clicks
    expect(sounds.length).toBeLessThanOrEqual(2)
  })

  it('wakes the audio engine, which browsers keep asleep until a person has interacted', () => {
    const { context, state } = fakeContext()
    createMetronome(() => context).start(source().source)
    expect(state.resumed).toBe(1)
  })

  it('keeps one audio engine across starts, and releases it on dispose', () => {
    const { context, state } = fakeContext()
    const make = vi.fn(() => context)
    const metronome = createMetronome(make)
    metronome.start(source().source)
    metronome.stop()
    metronome.start(source().source)
    expect(make).toHaveBeenCalledTimes(1)
    metronome.dispose()
    expect(state.closed).toBe(true)
    metronome.start(source().source) // usable again afterwards, with a fresh engine
    expect(make).toHaveBeenCalledTimes(2)
  })

  it('does nothing, and does not throw, where there is no audio engine', () => {
    const metronome = createMetronome(() => {
      throw new Error('AudioContext is not supported')
    })
    expect(() => metronome.start(source().source)).not.toThrow()
    expect(() => vi.advanceTimersByTime(100)).not.toThrow()
    expect(() => metronome.dispose()).not.toThrow()
  })

  it('carries on if waking the audio engine fails', () => {
    const { context } = fakeContext()
    context.resume = () => Promise.reject(new Error('blocked'))
    const { source: src } = source(0)
    expect(() => createMetronome(() => context).start(src)).not.toThrow()
    vi.advanceTimersByTime(25)
  })

  it('stopping when never started is harmless', () => {
    expect(() => createMetronome(() => fakeContext().context).stop()).not.toThrow()
  })
})
