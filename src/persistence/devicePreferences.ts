// Per-device screen preferences (which panels are open). Deliberately NOT part
// of a project: they describe how this person likes their screen laid out, not
// the dance, so they are not synced, versioned or shared between projects.

export interface DevicePreferences {
  /** Dancer sidebar open (wide screens). */
  sidebarOpen: boolean
  /** Bottom formation bar open. */
  formationBarOpen: boolean
}

export const DEFAULT_DEVICE_PREFERENCES: DevicePreferences = {
  sidebarOpen: true,
  formationBarOpen: true,
}

const KEY = 'dance360:device-preferences'

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
      }
    }
  } catch {
    // Unavailable or corrupt storage: fall through to the defaults.
  }
  return DEFAULT_DEVICE_PREFERENCES
}

export function saveDevicePreferences(prefs: DevicePreferences) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // Storage can be unavailable (private mode); the layout just won't be remembered.
  }
}
