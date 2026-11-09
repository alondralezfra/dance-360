import { create } from 'zustand'
import { analyzeAudio, UnreadableAudioError } from '../audio/analyze'
import { sha256Hex } from '../lib/hash'
import type { Peaks } from '../model/peaks'
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

/** Only the latest `refresh` may apply its result (the song can change while it works). */
let refreshing = 0

export const useSong = create<SongState>()((set) => ({
  file: 'none',
  peaks: null,
  peaksHash: null,
  busy: false,
  error: null,

  dismissError: () => set({ error: null }),

  refresh: async () => {
    const mine = ++refreshing
    const current = () => mine === refreshing
    const song = useProject.getState().song
    if (!song) {
      set({ file: 'none', peaks: null, peaksHash: null })
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
        peaks = (await analyzeAudio(await blob.arrayBuffer())).peaks
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
      useProject.getState().setSong({
        name: file.name,
        durationSec: analysis.durationSec,
        size: file.size,
        mime: file.type || 'application/octet-stream',
        hash,
      })
      ++refreshing // a refresh already under way would describe the old song
      set({ file: 'present', peaks: analysis.peaks, peaksHash: hash })
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
    set({ file: 'none', peaks: null, peaksHash: null, error: null })
    await pruneUnusedAudio()
  },
}))
