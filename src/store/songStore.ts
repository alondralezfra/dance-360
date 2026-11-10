import { create } from 'zustand'
import { analyzeAudio, UnreadableAudioError } from '../audio/analyze'
import { sha256Hex } from '../lib/hash'
import type { Peaks } from '../model/peaks'
import { isDefaultTempo } from '../model/tempo'
import type { TempoEstimate } from '../model/tempoEstimate'
import { audioRepository } from '../persistence'
import { pruneUnusedAudio } from './audioCleanup'
import { useProject } from './projectStore'

// The song as the screen needs it: is the file on this device, what does it look
// like (waveform), is something in progress. The project itself only records the
// song's name, length and hash (model/types.ts `Song`); the file and its derived
// peaks live in the AudioRepository, found by that hash. Not saved, not undoable.

/** Largest song file accepted. A bigger one would take too long to analyse on a phone. */
export const MAX_SONG_BYTES = 60 * 1024 * 1024

const AUDIO_NAME = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|weba)$/i
/** Browsers sometimes leave a file's type blank, so the name counts too. */
export const isAudioFile = (file: File) => file.type.startsWith('audio/') || AUDIO_NAME.test(file.name)

/** What was found out about the song's tempo, shown beside the tempo fields. */
export interface TempoNote {
  /** Which song it is about, so a note for one song is never shown for another. */
  hash: string
  /**
   * applied: it was set from the song (and can be changed);
   * suggested: it differs from the tempo already set, so it is offered but not applied;
   * unclear: the beat was too unclear to say.
   */
  kind: 'applied' | 'suggested' | 'unclear'
  /** The estimate, as it would be set (BPM to a tenth, start point to the millisecond). Null when unclear. */
  estimate: { bpm: number; startOffsetSec: number } | null
}

export type SongFileState =
  | 'none' // the project has no song
  | 'checking' // looking for the file on this device
  | 'present' // the file is here and ready
  | 'missing' // the project has a song but this device doesn't have the file (e.g. opened on another device)

interface SongState {
  file: SongFileState
  peaks: Peaks | null
  /** The song (by hash) the `peaks` belong to, so another project's waveform is never shown for this one. */
  peaksHash: string | null
  /** The tempo found in the song, if anything is worth saying about it. */
  tempoNote: TempoNote | null
  /** Reading or storing a file. */
  busy: boolean
  /** Something to tell the person, in plain words. */
  error: string | null
  /** Looks at the open project's song: is the file here, and what is its waveform? Call when the project or its song changes. */
  refresh: () => Promise<void>
  /** Attach a song to the open project (replacing any current one). */
  attach: (file: File) => Promise<void>
  /** Give the project's existing song its file again. It must be the same file (same hash). */
  reattach: (file: File) => Promise<void>
  /** Remove the song from the project. */
  remove: () => Promise<void>
  /** Take the tempo that was only suggested for the current song. */
  acceptEstimate: () => void
  /** Work out the tempo from the song's file now, and set it (the person asked, so it replaces what is there). */
  estimateFromSong: () => Promise<void>
  dismissError: () => void
}

/** A problem with the chosen file that the person can fix, already worded for them. */
class SongProblem extends Error {}

/** Reads a chosen file: checks it, hashes it, and works out its length and waveform. */
async function readSong(file: File) {
  if (!isAudioFile(file)) {
    throw new SongProblem('That does not look like an audio file. Try an MP3, M4A, WAV or OGG file.')
  }
  if (file.size > MAX_SONG_BYTES) {
    throw new SongProblem(`That file is too large (the limit is ${MAX_SONG_BYTES / 1024 / 1024} MB).`)
  }
  const data = await file.arrayBuffer()
  const hash = await sha256Hex(data)
  // Decoding empties the buffer it is given, so analyse a copy.
  const analysis = await analyzeAudio(data.slice(0))
  return { hash, analysis }
}

function wording(error: unknown): string {
  if (error instanceof SongProblem) return error.message
  if (error instanceof UnreadableAudioError) return `${error.message} Try an MP3, M4A, WAV or OGG file.`
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return 'There is not enough space on this device to keep the song. Free some space and try again.'
  }
  console.error('Song problem', error)
  return 'Something went wrong with the song. Please try again.'
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** An estimate as it would be set: BPM to a tenth (within the range the fields accept), the start point to the millisecond. */
const asTempo = (found: TempoEstimate) => ({
  bpm: clamp(Math.round(found.bpm * 10) / 10, 20, 300),
  startOffsetSec: Math.round(found.firstBeatSec * 1000) / 1000,
})

/** Only the latest `refresh` may apply its result (the song can change while it works). */
let refreshing = 0

export const useSong = create<SongState>()((set) => ({
  file: 'none',
  peaks: null,
  peaksHash: null,
  tempoNote: null,
  busy: false,
  error: null,

  dismissError: () => set({ error: null }),

  refresh: async () => {
    const mine = ++refreshing
    const current = () => mine === refreshing
    const song = useProject.getState().song
    if (!song) {
      set({ file: 'none', peaks: null, peaksHash: null, tempoNote: null })
      return
    }
    // Keep showing the same song's waveform while checking (no flicker); drop anything else's.
    set((s) => (s.peaksHash === song.hash && s.peaks ? {} : { file: 'checking', peaks: null, peaksHash: null }))
    try {
      const blob = await audioRepository.get(song.hash)
      if (!blob) {
        if (current()) set({ file: 'missing', peaks: null, peaksHash: null })
        return
      }
      // The peaks are cached beside the file; if they're gone, work them out again.
      let peaks = await audioRepository.getPeaks(song.hash)
      if (!peaks) {
        peaks = (await analyzeAudio(await blob.arrayBuffer(), undefined, { estimateTempo: false })).peaks
        await audioRepository.putPeaks(song.hash, peaks)
      }
      if (current()) set({ file: 'present', peaks, peaksHash: song.hash })
    } catch (error) {
      if (current()) set({ file: 'missing', peaks: null, peaksHash: null, error: wording(error) })
    }
  },

  attach: async (file) => {
    const projectId = useProject.getState().projectId
    set({ busy: true, error: null })
    try {
      const { hash, analysis } = await readSong(file)
      await audioRepository.put(hash, file)
      await audioRepository.putPeaks(hash, analysis.peaks)
      // If another project was opened while this worked, leave this one alone (the file is cleared later).
      if (useProject.getState().projectId !== projectId) return
      // The tempo found in the song: filled in if nobody has set one yet, otherwise only offered.
      const found = analysis.tempo ? asTempo(analysis.tempo) : null
      const current = useProject.getState().tempo
      const fillIn = found !== null && isDefaultTempo(current)
      const note: TempoNote = {
        hash,
        kind: found === null ? 'unclear' : fillIn ? 'applied' : 'suggested',
        estimate: found,
      }
      // One update for the song and its tempo, so a single undo takes back both.
      useProject.getState().setSong(
        {
          name: file.name,
          durationSec: analysis.durationSec,
          size: file.size,
          mime: file.type || 'application/octet-stream',
          hash,
        },
        fillIn ? { ...current, ...found } : undefined,
      )
      ++refreshing // a refresh already under way would describe the old song
      set({ file: 'present', peaks: analysis.peaks, peaksHash: hash, tempoNote: note })
      await pruneUnusedAudio() // the replaced song's file, if nothing else uses it
    } catch (error) {
      set({ error: wording(error) })
    } finally {
      set({ busy: false })
    }
  },

  reattach: async (file) => {
    const song = useProject.getState().song
    if (!song) return
    set({ busy: true, error: null })
    try {
      const { hash, analysis } = await readSong(file)
      if (hash !== song.hash) {
        throw new SongProblem(
          'That is not the same file this project was set up with. Choose the original file, or remove the song and attach this one instead.',
        )
      }
      await audioRepository.put(hash, file)
      await audioRepository.putPeaks(hash, analysis.peaks)
      ++refreshing
      set({ file: 'present', peaks: analysis.peaks, peaksHash: hash })
    } catch (error) {
      set({ error: wording(error) })
    } finally {
      set({ busy: false })
    }
  },

  remove: async () => {
    useProject.getState().setSong(null)
    ++refreshing
    set({ file: 'none', peaks: null, peaksHash: null, tempoNote: null, error: null })
    await pruneUnusedAudio()
  },

  acceptEstimate: () => {
    const { tempoNote } = useSong.getState()
    if (!tempoNote?.estimate) return
    const project = useProject.getState()
    project.setTempo({ ...project.tempo, ...tempoNote.estimate })
    set({ tempoNote: { ...tempoNote, kind: 'applied' } })
  },

  estimateFromSong: async () => {
    const song = useProject.getState().song
    if (!song) return
    set({ busy: true, error: null })
    try {
      const blob = await audioRepository.get(song.hash)
      if (!blob) {
        throw new SongProblem('The song file is not on this device, so its tempo cannot be worked out. Choose the file again first.')
      }
      const { tempo } = await analyzeAudio(await blob.arrayBuffer())
      // The song may have been replaced or removed while this worked.
      if (useProject.getState().song?.hash !== song.hash) return
      const found = tempo ? asTempo(tempo) : null
      if (found) {
        const project = useProject.getState()
        project.setTempo({ ...project.tempo, ...found })
      }
      set({ tempoNote: { hash: song.hash, kind: found ? 'applied' : 'unclear', estimate: found } })
    } catch (error) {
      set({ error: wording(error) })
    } finally {
      set({ busy: false })
    }
  },
}))
