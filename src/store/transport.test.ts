// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClickSource } from '../audio/metronome'
import { createEmptyProject } from '../model/project'
import type { Song } from '../model/types'

// A stand-in song player and metronome that the test controls, and in-memory storage.
const audio = vi.hoisted(() => ({
  players: [] as unknown[],
  metronomes: [] as unknown[],
}))

interface FakePlayer {
  time: () => number
  playing: boolean
  position: number
  seek: ReturnType<typeof vi.fn>
  play: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
  onEnded: (fn: () => void) => () => void
  finish: () => void
}
interface FakeMetronome {
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
}

vi.mock('../audio/player', () => ({
  createPlayerFromBlob: vi.fn(() => {
    let ended: (() => void) | null = null
    const player: FakePlayer = {
      position: 0,
      playing: false,
      time: () => player.position,
      seek: vi.fn((sec: number) => void (player.position = sec)),
      play: vi.fn(async () => void (player.playing = true)),
      pause: vi.fn(() => void (player.playing = false)),
      dispose: vi.fn(),
      onEnded: (fn) => {
        ended = fn
        return () => {}
      },
      finish: () => ended?.(),
    }
    audio.players.push(player)
    return player
  }),
}))
vi.mock('../audio/metronome', () => ({
  createMetronome: vi.fn(() => {
    const metronome: FakeMetronome = { start: vi.fn(), stop: vi.fn(), dispose: vi.fn() }
    audio.metronomes.push(metronome)
    return metronome
  }),
}))
vi.mock('../persistence', async () => {
  const { createMemoryAudioRepository } = await import('../persistence/memoryAudioRepository')
  const { createRepository } = await import('../persistence/createRepository')
  const { createMemoryRecordStore } = await import('../persistence/memoryRecordStore')
  return { audioRepository: createMemoryAudioRepository(), repository: createRepository(createMemoryRecordStore()) }
})

const { audioRepository } = await import('../persistence')
const { createPlayerFromBlob } = await import('../audio/player')
const { useProject } = await import('./projectStore')
const { useUi } = await import('./uiStore')
const { playheadClock, startTransport, useTransport } = await import('./transport')

const song: Song = { name: 'a.mp3', durationSec: 60, size: 3, mime: 'audio/mpeg', hash: 'h1' }
const players = () => audio.players as FakePlayer[]
const metronomes = () => audio.metronomes as FakeMetronome[]
const state = () => useTransport.getState()
const frames = (n = 1) => {
  for (let i = 0; i < n; i++) vi.advanceTimersByTime(16)
}

let stop: () => void

function openProject() {
  const project = createEmptyProject()
  useProject.setState({
    ...project,
    formations: [
      { ...project.formations[0], id: 'f1', name: 'One', count: 0 },
      { ...project.formations[0], id: 'f2', name: 'Two', count: 16 },
      { ...project.formations[0], id: 'f3', name: 'Three', count: 40 },
    ],
    song,
    projectId: 'p1',
    status: 'ready',
  })
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  audio.players.length = 0
  audio.metronomes.length = 0
  vi.mocked(createPlayerFromBlob).mockClear()
  await audioRepository.put('h1', new Blob(['song']))
  useProject.setState({ projectId: null, status: 'idle', song: null })
  stop = startTransport()
  useTransport.setState({ playing: false, metronome: false, loading: false, error: null })
  openProject()
  useUi.getState().reset()
  playheadClock.set(0)
})
afterEach(async () => {
  stop()
  vi.useRealTimers()
  for (const hash of await audioRepository.list()) await audioRepository.remove(hash)
})

describe('playing', () => {
  it('loads the song file, plays it, and the playhead follows the sound frame by frame', async () => {
    await state().play()
    expect(state().playing).toBe(true)
    expect(createPlayerFromBlob).toHaveBeenCalledTimes(1)
    expect(players()[0].play).toHaveBeenCalled()

    players()[0].position = 2 // 120 BPM: two counts a second, so count 4
    frames()
    expect(playheadClock.get()).toBeCloseTo(4)
    players()[0].position = 3.25
    frames()
    expect(playheadClock.get()).toBeCloseTo(6.5)
  })

  it('starts from where the playhead is, not from the start of the song', async () => {
    playheadClock.set(10) // count 10 = 5 seconds
    await state().play()
    expect(players()[0].seek).toHaveBeenCalledWith(5)
  })

  it('starts again from the beginning when the playhead is at the end of the song', async () => {
    playheadClock.set(120) // 60 s: the end
    await state().play()
    expect(players()[0].seek).toHaveBeenCalledWith(0)
  })

  it('takes the start point into account when working out where in the song to start', async () => {
    useProject.setState({ tempo: { bpm: 120, startOffsetSec: 3, changes: [] } })
    playheadClock.set(4) // count 4 is 3 + 2 = 5 s into the song
    await state().play()
    expect(players()[0].seek).toHaveBeenCalledWith(5)
  })

  it('does nothing when the project has no song', async () => {
    useProject.setState({ song: null })
    await state().play()
    expect(state()).toMatchObject({ playing: false, error: null })
    expect(createPlayerFromBlob).not.toHaveBeenCalled()
  })

  it('says so when the song file is not on this device', async () => {
    useProject.setState({ song: { ...song, hash: 'not-here' } })
    await state().play()
    expect(state().playing).toBe(false)
    expect(state().error).toMatch(/not on this device/)
    expect(state().loading).toBe(false)
  })

  it('says so, and is ready to try again, when the browser refuses to start the sound', async () => {
    await state().play() // creates the player
    state().pause()
    players()[0].play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
    await state().play()
    expect(state().playing).toBe(false)
    expect(state().error).toMatch(/Press Play again/)
    await state().play()
    expect(state().playing).toBe(true)
  })

  it('gives a plain message for any other problem, and logs the detail', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await state().play()
    state().pause()
    players()[0].play.mockRejectedValueOnce(new Error('decode'))
    await state().play()
    expect(state().error).toBe('The song could not be played.')
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })

  it('ignores a second press while the first is still loading, and while already playing', async () => {
    const first = state().play()
    const second = state().play()
    await Promise.all([first, second])
    expect(createPlayerFromBlob).toHaveBeenCalledTimes(1)
    await state().play()
    expect(players()[0].play).toHaveBeenCalledTimes(1)
  })

  it('keeps the same player when playing again, and builds a new one for a different song', async () => {
    await state().play()
    state().pause()
    await state().play()
    expect(createPlayerFromBlob).toHaveBeenCalledTimes(1)
    state().pause()

    await audioRepository.put('h2', new Blob(['other']))
    useProject.setState({ song: { ...song, hash: 'h2' } })
    expect(players()[0].dispose).toHaveBeenCalled() // the old song is let go of
    await state().play()
    expect(createPlayerFromBlob).toHaveBeenCalledTimes(2)
  })

  it('uses the latest tempo each frame', async () => {
    await state().play()
    players()[0].position = 2
    frames()
    expect(playheadClock.get()).toBeCloseTo(4)
    useProject.setState({ tempo: { bpm: 60, startOffsetSec: 0, changes: [] } })
    frames()
    expect(playheadClock.get()).toBeCloseTo(2) // one count a second now
  })

  it('toggles between playing and paused', async () => {
    await state().toggle()
    expect(state().playing).toBe(true)
    await state().toggle()
    expect(state().playing).toBe(false)
  })

  it('clears an error when dismissed, and when playing is tried again', async () => {
    useTransport.setState({ error: 'oops' })
    state().dismissError()
    expect(state().error).toBeNull()
    useTransport.setState({ error: 'old' })
    await state().play()
    expect(state().error).toBeNull()
  })
})

describe('pausing', () => {
  it('stops the playhead where the sound stopped, and stays there', async () => {
    await state().play()
    players()[0].position = 5
    frames()
    state().pause()
    expect(state().playing).toBe(false)
    expect(players()[0].pause).toHaveBeenCalled()
    const where = playheadClock.get()
    expect(where).toBeCloseTo(10)
    players()[0].position = 9
    frames(5)
    expect(playheadClock.get()).toBe(where) // no longer following
  })

  it('pausing when nothing is playing is harmless', () => {
    expect(() => state().pause()).not.toThrow()
    expect(state().playing).toBe(false)
  })

  it('stops at the end of the song, with the playhead at the end', async () => {
    await state().play()
    players()[0].position = 60
    players()[0].finish()
    expect(state().playing).toBe(false)
    expect(playheadClock.get()).toBeCloseTo(120)
  })
})

describe('seeking', () => {
  it('moves the playhead while paused without touching the sound, and selects the formation it is in', () => {
    state().seek(20)
    expect(playheadClock.get()).toBe(20)
    expect(useUi.getState()).toMatchObject({ currentFormationId: 'f2', selectionSource: 'playhead' })
    expect(createPlayerFromBlob).not.toHaveBeenCalled()
  })

  it('moves the sound too while playing', async () => {
    await state().play()
    state().seek(30) // 15 s
    expect(players()[0].seek).toHaveBeenLastCalledWith(15)
    expect(playheadClock.get()).toBeCloseTo(30)
  })

  it('keeps inside the song', async () => {
    await state().play()
    state().seek(10_000)
    expect(players()[0].seek).toHaveBeenLastCalledWith(60)
    expect(playheadClock.get()).toBeCloseTo(120)
    state().seek(-50)
    expect(players()[0].seek).toHaveBeenLastCalledWith(0)
  })

  it('the next play begins from the seek position', async () => {
    state().seek(24)
    await state().play()
    expect(players()[0].seek).toHaveBeenCalledWith(12)
  })

  it('works with no song, by counts alone, never before count 0', () => {
    useProject.setState({ song: null })
    state().seek(41)
    expect(playheadClock.get()).toBe(41)
    expect(useUi.getState().currentFormationId).toBe('f3')
    state().seek(-8)
    expect(playheadClock.get()).toBe(0)
  })
})

describe('the selected formation follows the song', () => {
  it('moves on as the playhead passes each formation, once each', async () => {
    const select = vi.spyOn(useUi.getState(), 'selectFormation')
    await state().play()
    players()[0].position = 1 // count 2
    frames()
    expect(useUi.getState().currentFormationId).toBe('f1')
    players()[0].position = 8 // count 16: the second formation lands
    frames()
    expect(useUi.getState().currentFormationId).toBe('f2')
    expect(useUi.getState().selectionSource).toBe('playhead')
    const calls = select.mock.calls.length
    players()[0].position = 9
    frames(3)
    expect(select.mock.calls.length).toBe(calls) // not re-selected every frame
    players()[0].position = 20 // count 40
    frames()
    expect(useUi.getState().currentFormationId).toBe('f3')
    select.mockRestore()
  })

  it('stops the song when the person steps to a formation themselves', async () => {
    await state().play()
    useUi.getState().selectFormation('f3') // the person
    expect(state().playing).toBe(false)
    expect(players()[0].pause).toHaveBeenCalled()
  })

  it('does not stop the song for a change the playhead made', async () => {
    await state().play()
    useUi.getState().selectFormation('f2', 'playhead')
    expect(state().playing).toBe(true)
  })

  it('does nothing about a person selecting a formation while nothing is playing', () => {
    useUi.getState().selectFormation('f3')
    expect(state().playing).toBe(false)
    expect(players()).toHaveLength(0)
  })
})

describe('the metronome', () => {
  it('stays silent until it is switched on, then clicks while the song plays', async () => {
    await state().play()
    expect(metronomes()).toHaveLength(0) // not even created
    state().setMetronome(true)
    expect(metronomes()[0].start).toHaveBeenCalledTimes(1)
  })

  it('starts with the song when it was already on, and stops with it', async () => {
    state().setMetronome(true)
    expect(metronomes()).toHaveLength(0) // nothing playing yet
    await state().play()
    expect(metronomes()[0].start).toHaveBeenCalledTimes(1)
    state().pause()
    expect(metronomes()[0].stop).toHaveBeenCalled()
  })

  it('can be switched off while playing', async () => {
    state().setMetronome(true)
    await state().play()
    state().setMetronome(false)
    expect(metronomes()[0].stop).toHaveBeenCalled()
    expect(state().metronome).toBe(false)
  })

  it('is given the song position and the clicks of the current tempo', async () => {
    state().setMetronome(true)
    await state().play()
    const source = metronomes()[0].start.mock.calls[0][0] as ClickSource
    players()[0].position = 3.5
    expect(source.time()).toBe(3.5)
    expect(source.clicks(0, 1.1).map((c) => c.count)).toEqual([0, 1, 2]) // 120 BPM
    useProject.setState({ tempo: { bpm: 60, startOffsetSec: 0, changes: [] } })
    expect(source.clicks(0, 1.1).map((c) => c.count)).toEqual([0, 1]) // the new tempo, without restarting
  })

  it('restarts after a jump in the song so it clicks from the new place', async () => {
    state().setMetronome(true)
    await state().play()
    state().seek(30)
    expect(metronomes()[0].start).toHaveBeenCalledTimes(2)
  })

  it('does not start on a jump when it is off', async () => {
    await state().play()
    state().seek(30)
    expect(metronomes()).toHaveLength(0)
  })

  it('switching it on or off while paused only remembers the choice', () => {
    state().setMetronome(true)
    expect(state().metronome).toBe(true)
    state().setMetronome(false)
    expect(metronomes()).toHaveLength(0)
  })
})

describe('keeping in step with the project', () => {
  it('stops and lets go of the song when its song is removed', async () => {
    await state().play()
    useProject.setState({ song: null })
    expect(state().playing).toBe(false)
    expect(players()[0].dispose).toHaveBeenCalled()
  })

  it('stops when the project is closed, and when another is opened', async () => {
    await state().play()
    useProject.setState({ status: 'idle', projectId: null })
    expect(state().playing).toBe(false)
    expect(players()[0].dispose).toHaveBeenCalled()

    openProject()
    await state().play()
    useProject.setState({ projectId: 'p2' })
    expect(state().playing).toBe(false)
  })

  it('puts the playhead at the first formation when a project opens', () => {
    useProject.setState({ projectId: null, status: 'idle' })
    playheadClock.set(77)
    const project = createEmptyProject()
    useProject.setState({
      ...project,
      formations: [{ ...project.formations[0], id: 'x', count: 8 }],
      projectId: 'p9',
      status: 'ready',
    })
    expect(playheadClock.get()).toBe(8)
  })

  it('releases the metronome with everything else, and stops when the transport is stopped', async () => {
    state().setMetronome(true)
    await state().play()
    stop()
    expect(state().playing).toBe(false)
    expect(metronomes()[0].dispose).toHaveBeenCalled()
    stop = startTransport() // (so the shared teardown still has something to stop)
  })
})
