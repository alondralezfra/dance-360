import { create } from 'zustand'
import { createMetronome, type Metronome } from '../audio/metronome'
import { createPlayerFromBlob, type Player } from '../audio/player'
import { createPlayheadClock } from '../lib/playheadClock'
import { formationIndexAt } from '../model/formations'
import { clicksBetween } from '../model/metronome'
import { firstToPlace, tapToCount } from '../model/tapSnap'
import { countToSeconds, formatCount, secondsToCount } from '../model/tempo'
import { audioRepository } from '../persistence'
import { useProject } from './projectStore'
import { useSpeaker } from './speakerStore'
import { useUi } from './uiStore'

// Playing the song. This is the one place that connects the song's player, the metronome,
// the playhead the stage and timeline draw, and the formation that is selected. It is
// screen state: not saved, not undoable (decisions/0019).

/**
 * Where the song is, as a count. One for the whole app, outside React, so the stage dots and
 * the timeline can follow it every frame without re-rendering. While the song plays, the
 * transport sets it each frame from the audio; while paused, it stays where it was left.
 */
export const playheadClock = createPlayheadClock(0)

interface TransportState {
  playing: boolean
  /** Click on every count while playing. */
  metronome: boolean
  /** Fetching the song file so it can play. */
  loading: boolean
  /** Something to tell the person, in plain words. */
  error: string | null
  /** What the last tap did, or why it did nothing ("Formation 2 placed at Set 3 · Count 1"). Cleared when the take ends. */
  markMessage: string | null
  /** Plays from where the playhead is (from the start, if it is at the end). */
  play: () => Promise<void>
  pause: () => void
  toggle: () => Promise<void>
  /** Moves the playhead to a count, whether the song is playing or paused. */
  seek: (count: number) => void
  /**
   * Tap-to-snap: while the song plays, puts the next formation on the count being heard (nearest whole count,
   * after taking the speaker delay off). The first tap of a take places the formation after the one the song is in
   * (or the first formation, before the dance starts); each tap after places the next, and the whole take is one undo step.
   * A pause, a jump or a new play ends the take. Does nothing when the song is not playing.
   */
  mark: () => void
  setMetronome: (on: boolean) => void
  dismissError: () => void
}

// The player and the metronome engine live here, not in React state: they are browser objects.
let player: Player | null = null
let playerHash: string | null = null
let metronome: Metronome | null = null
let frame: number | null = null
// A take of taps: the undo group it is recorded under, and the index of the formation the next tap places.
let take: string | null = null
let takeNext = -1
let takeSeq = 0

const NOTHING_LEFT = 'Every formation after this point has been placed. Add another formation on the Stage to keep marking.'

/** How late this device's speaker is, in seconds. */
const speakerDelaySec = () => useSpeaker.getState().delayMs / 1000

function endTake() {
  take = null
  takeNext = -1
  if (useProject.getState().undoGroup !== null) useProject.getState().setUndoGroup(null)
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** Selects the formation the playhead has reached (marked as the playhead's choice, so the stage doesn't preview a step). */
function followSelection(count: number) {
  const { formations } = useProject.getState()
  const id = formations[formationIndexAt(formations, count)]?.id
  if (id && useUi.getState().currentFormationId !== id) useUi.getState().selectFormation(id, 'playhead')
}

function stopLoop() {
  if (frame !== null) cancelAnimationFrame(frame)
  frame = null
}

function runLoop(p: Player) {
  stopLoop()
  const tick = () => {
    // The sound reaches the person a moment after the player's position, so the dots show where the music is *heard*.
    const count = secondsToCount(p.time() - speakerDelaySec(), useProject.getState().tempo)
    playheadClock.set(count)
    followSelection(count)
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}

function startMetronome(p: Player) {
  metronome ??= createMetronome()
  metronome.start({
    time: () => p.time(),
    clicks: (from, to) => clicksBetween(useProject.getState().tempo, from, to),
  })
}

function wording(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'The browser would not start the sound. Press Play again.'
  }
  console.error('Playback problem', error)
  return 'The song could not be played.'
}

/** The player for the project's song, fetched from the device the first time it is needed. Null if there is no song or no file. */
async function ensurePlayer(): Promise<Player | null> {
  const song = useProject.getState().song
  if (!song) return null
  if (player && playerHash === song.hash) return player
  releasePlayer()
  const blob = await audioRepository.get(song.hash)
  if (!blob) return null
  // The song may have been replaced or removed while the file was being fetched.
  if (useProject.getState().song?.hash !== song.hash) return null
  const created = createPlayerFromBlob(blob)
  created.onEnded(handleEnded)
  player = created
  playerHash = song.hash
  return created
}

function releasePlayer() {
  player?.dispose()
  player = null
  playerHash = null
}

/** Stops playing, keeping the player (the song stays loaded) and the playhead where it is. */
function pauseNow() {
  stopLoop()
  metronome?.stop()
  if (player) {
    player.pause()
    playheadClock.set(secondsToCount(player.time() - speakerDelaySec(), useProject.getState().tempo))
  }
  endTake()
  useTransport.setState({ playing: false, markMessage: null })
}

/** Stops everything and lets go of the song file (the song or project changed). */
function release() {
  pauseNow()
  releasePlayer()
  metronome?.dispose()
  metronome = null
}

function handleEnded() {
  const song = useProject.getState().song
  pauseNow()
  if (song) playheadClock.set(secondsToCount(song.durationSec, useProject.getState().tempo))
}

export const useTransport = create<TransportState>()((set, get) => ({
  playing: false,
  metronome: false,
  loading: false,
  error: null,
  markMessage: null,

  dismissError: () => set({ error: null }),

  play: async () => {
    const { playing, loading } = get()
    const song = useProject.getState().song
    if (playing || loading || !song) return
    set({ loading: true, error: null, markMessage: null })
    try {
      const p = await ensurePlayer()
      if (!p) {
        set({ error: 'The song file is not on this device. Choose it again on the Song tab.' })
        return
      }
      const { tempo } = useProject.getState()
      let sec = countToSeconds(playheadClock.get(), tempo)
      if (sec >= song.durationSec - 0.05) sec = 0 // at the end: start again from the beginning
      // Start the audio the speaker's delay ahead, so the sound heard now is where the playhead is.
      p.seek(clamp(sec + speakerDelaySec(), 0, song.durationSec))
      await p.play()
      set({ playing: true })
      runLoop(p)
      if (get().metronome) startMetronome(p)
    } catch (error) {
      set({ error: wording(error) })
    } finally {
      set({ loading: false })
    }
  },

  pause: pauseNow,

  toggle: async () => {
    if (get().playing) pauseNow()
    else await get().play()
  },

  seek: (count) => {
    const { song, tempo } = useProject.getState()
    // Inside the song: from its first moment to its end. (With no song, from count 0 onwards.)
    const sec = song ? clamp(countToSeconds(count, tempo), 0, song.durationSec) : null
    const target = sec === null ? Math.max(0, count) : secondsToCount(sec, tempo)
    playheadClock.set(target)
    followSelection(target)
    endTake() // jumping somewhere else starts a new take
    if (player && sec !== null && get().playing) {
      player.seek(sec + speakerDelaySec())
      if (get().metronome) startMetronome(player) // restart, so it clicks from the new place
    }
  },

  mark: () => {
    if (!get().playing || !player) return
    const { formations, tempo } = useProject.getState()
    const delay = speakerDelaySec()
    if (take === null) {
      const first = firstToPlace(formations, secondsToCount(player.time() - delay, tempo))
      if (first === -1) {
        set({ markMessage: NOTHING_LEFT })
        return
      }
      take = `take:${++takeSeq}`
      takeNext = first
      useProject.getState().setUndoGroup(take)
    }
    const target = formations[takeNext]
    if (!target) {
      set({ markMessage: NOTHING_LEFT })
      return
    }
    useProject.getState().placeFormation(target.id, tapToCount(player.time(), tempo, delay))
    takeNext += 1
    const placed = useProject.getState().formations.find((f) => f.id === target.id)!
    set({ markMessage: `${placed.name} placed at ${formatCount(placed.count)}` })
  },

  setMetronome: (on) => {
    set({ metronome: on })
    if (!get().playing || !player) return
    if (on) startMetronome(player)
    else metronome?.stop()
  },
}))

/**
 * Keeps the transport in step with the project and the selection. Call once at startup.
 * - Opening a project puts the playhead at its first formation; closing it, or changing or
 *   removing its song, stops the sound and lets go of the file.
 * - When the person steps to a formation themselves, playing stops (the stage previews the step).
 */
export function startTransport() {
  const stopProject = useProject.subscribe((state, prev) => {
    const opened = state.status === 'ready' && (prev.status !== 'ready' || state.projectId !== prev.projectId)
    const closed = state.status !== 'ready' && prev.status === 'ready'
    if (closed || state.projectId !== prev.projectId) release()
    if (opened) playheadClock.set(state.formations[0]?.count ?? 0)
    else if (state.song?.hash !== prev.song?.hash) release()
  })
  const stopUi = useUi.subscribe((state, prev) => {
    if (state.currentFormationId !== prev.currentFormationId && state.selectionSource === 'user' && useTransport.getState().playing) {
      pauseNow()
    }
  })
  return () => {
    stopProject()
    stopUi()
    release()
  }
}
