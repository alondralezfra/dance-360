import { MAX_SPEAKER_DELAY_MS } from '../model/calibration'

// Per-device preferences (which panels are open, how late this device's speaker is). Deliberately
// NOT part of a project: they describe this person's screen and speaker, not the dance, so they
// are not synced, versioned or shared between projects.

export interface DevicePreferences {
  /** Dancer sidebar open (wide screens). */
  sidebarOpen: boolean
  /** Bottom formation bar open. */
  formationBarOpen: boolean
  /** How much later than the song's position this device's speaker sounds, in ms (Bluetooth is 150 to 300). */
  speakerDelayMs: number
}

export const DEFAULT_DEVICE_PREFERENCES: DevicePreferences = {
  sidebarOpen: true,
  formationBarOpen: true,
  speakerDelayMs: 0,
}

const KEY = 'dance360:device-preferences'

/** What is stored, exactly as stored (an empty object if there is nothing, or it is unreadable). */
function readStored(): Record<string, unknown> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  } catch {
    return {}
  }
}

/** Saved preferences, with defaults for anything missing, unreadable or of the wrong type. */
export function loadDevicePreferences(): DevicePreferences {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (raw && typeof raw === 'object') {
      return {
        sidebarOpen:
          typeof raw.sidebarOpen === 'boolean' ? raw.sidebarOpen : DEFAULT_DEVICE_PREFERENCES.sidebarOpen,
        formationBarOpen:
          typeof raw.formationBarOpen === 'boolean'
            ? raw.formationBarOpen
            : DEFAULT_DEVICE_PREFERENCES.formationBarOpen,
        speakerDelayMs:
          typeof raw.speakerDelayMs === 'number' && Number.isFinite(raw.speakerDelayMs)
            ? Math.min(Math.max(Math.round(raw.speakerDelayMs), 0), MAX_SPEAKER_DELAY_MS)
            : DEFAULT_DEVICE_PREFERENCES.speakerDelayMs,
      }
    }
  } catch {
    // Unavailable or corrupt storage: fall through to the defaults.
  }
  return DEFAULT_DEVICE_PREFERENCES
}

/** Saves the given preferences, leaving any others exactly as they were saved (so one screen's setting never wipes another's). */
export function saveDevicePreferences(changes: Partial<DevicePreferences>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readStored(), ...changes }))
  } catch {
    // Storage can be unavailable (private mode); the preference just won't be remembered.
  }
}
