import { create } from 'zustand'
import { createCalibration } from '../audio/calibration'
import { useSpeaker } from './speakerStore'
import { useTransport } from './transport'

// The "tap along to the clicks" speaker-delay measurement (decisions/0020). Screen state only:
// the delay it finds is kept by speakerStore once the person accepts it.

export type CalibrationStatus = 'idle' | 'starting' | 'listening' | 'done'

interface CalibrationState {
  status: CalibrationStatus
  /** Taps noted so far in this run. */
  taps: number
  /** The delay found, in ms, once the clicks have finished (null: too few taps lined up with the clicks). */
  result: number | null
  /** Something to tell the person, in plain words. */
  error: string | null
  /** Pauses the song and starts the clicks. */
  start: () => Promise<void>
  /** The person tapped. */
  tap: () => void
  /** Uses the delay that was found, and finishes. */
  apply: () => void
  /** Stops and forgets this run. */
  cancel: () => void
}

const calibration = createCalibration()
const fresh = { status: 'idle', taps: 0, result: null, error: null } as const

export const useCalibration = create<CalibrationState>()((set, get) => ({
  ...fresh,

  start: async () => {
    const { status } = get()
    if (status === 'starting' || status === 'listening') return
    useTransport.getState().pause()
    set({ ...fresh, status: 'starting' })
    try {
      await calibration.start(() => set({ status: 'done', result: calibration.result() }))
      set({ status: 'listening' })
    } catch (error) {
      const refused = error instanceof DOMException && error.name === 'NotAllowedError'
      set({
        ...fresh,
        error: refused ? 'The browser would not start the sound. Press Calibrate again.' : 'The test sound could not be played.',
      })
    }
  },

  tap: () => {
    if (get().status !== 'listening') return
    calibration.tap()
    set({ taps: calibration.taps() })
  },

  apply: () => {
    const { result } = get()
    if (result === null) return
    useSpeaker.getState().setDelayMs(result)
    calibration.stop()
    set(fresh)
  },

  cancel: () => {
    calibration.stop()
    set(fresh)
  },
}))
