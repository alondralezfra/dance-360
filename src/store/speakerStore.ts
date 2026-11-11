import { create } from 'zustand'
import { MAX_SPEAKER_DELAY_MS } from '../model/calibration'
import { loadDevicePreferences, saveDevicePreferences } from '../persistence/devicePreferences'

// How much later than the song's position this device's speaker sounds. Per device and remembered,
// but not part of any project (see persistence/devicePreferences.ts, decisions/0020). The transport
// uses it to line the dots up with the sound and to place taps where the person heard the beat.

interface SpeakerState {
  /** In milliseconds, a whole number from 0 to `MAX_SPEAKER_DELAY_MS`. */
  delayMs: number
  setDelayMs: (ms: number) => void
}

export const useSpeaker = create<SpeakerState>()((set) => ({
  delayMs: loadDevicePreferences().speakerDelayMs,
  setDelayMs: (ms) => {
    const delayMs = Number.isFinite(ms) ? Math.min(Math.max(Math.round(ms), 0), MAX_SPEAKER_DELAY_MS) : 0
    set({ delayMs })
    saveDevicePreferences({ speakerDelayMs: delayMs })
  },
}))
