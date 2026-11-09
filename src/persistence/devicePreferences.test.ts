// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_DEVICE_PREFERENCES,
  loadDevicePreferences,
  saveDevicePreferences,
} from './devicePreferences'

const KEY = 'dance360:device-preferences'

beforeEach(() => localStorage.clear())

describe('device preferences', () => {
  it('defaults to everything open', () => {
    expect(loadDevicePreferences()).toEqual({ sidebarOpen: true, formationBarOpen: true })
  })

  it('round-trips', () => {
    saveDevicePreferences({ sidebarOpen: false, formationBarOpen: true })
    expect(loadDevicePreferences()).toEqual({ sidebarOpen: false, formationBarOpen: true })
  })

  it('falls back to defaults for corrupt or wrongly typed data', () => {
    localStorage.setItem(KEY, '{not json')
    expect(loadDevicePreferences()).toEqual(DEFAULT_DEVICE_PREFERENCES)
    localStorage.setItem(KEY, JSON.stringify({ sidebarOpen: 'no', formationBarOpen: false }))
    expect(loadDevicePreferences()).toEqual({ sidebarOpen: true, formationBarOpen: false })
    localStorage.setItem(KEY, 'null')
    expect(loadDevicePreferences()).toEqual(DEFAULT_DEVICE_PREFERENCES)
  })

  it('does not throw when storage is unavailable', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('denied')
    }
    try {
      expect(() => saveDevicePreferences(DEFAULT_DEVICE_PREFERENCES)).not.toThrow()
    } finally {
      Storage.prototype.setItem = original
    }
  })
})
