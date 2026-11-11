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
    expect(loadDevicePreferences()).toEqual({ sidebarOpen: true, formationBarOpen: true, speakerDelayMs: 0 })
  })

  it('round-trips', () => {
    saveDevicePreferences({ sidebarOpen: false, formationBarOpen: true, speakerDelayMs: 220 })
    expect(loadDevicePreferences()).toEqual({ sidebarOpen: false, formationBarOpen: true, speakerDelayMs: 220 })
  })

  it('saving one setting leaves the others as they were saved', () => {
    saveDevicePreferences({ speakerDelayMs: 180 })
    saveDevicePreferences({ sidebarOpen: false })
    expect(loadDevicePreferences()).toEqual({ sidebarOpen: false, formationBarOpen: true, speakerDelayMs: 180 })
  })

  it('saving over unreadable or oddly shaped storage starts clean, and writes only what it was given', () => {
    for (const bad of ['{not json', '[1,2]', '"text"', '5', 'null']) {
      localStorage.setItem(KEY, bad)
      saveDevicePreferences({ speakerDelayMs: 150 })
      expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ speakerDelayMs: 150 })
    }
  })

  it('keeps the speaker delay a whole number inside its limits, and ignores nonsense', () => {
    localStorage.setItem(KEY, JSON.stringify({ speakerDelayMs: 99999 }))
    expect(loadDevicePreferences().speakerDelayMs).toBe(1000)
    localStorage.setItem(KEY, JSON.stringify({ speakerDelayMs: -40 }))
    expect(loadDevicePreferences().speakerDelayMs).toBe(0)
    localStorage.setItem(KEY, JSON.stringify({ speakerDelayMs: 123.6 }))
    expect(loadDevicePreferences().speakerDelayMs).toBe(124)
    localStorage.setItem(KEY, JSON.stringify({ speakerDelayMs: 'slow' }))
    expect(loadDevicePreferences().speakerDelayMs).toBe(0)
  })

  it('falls back to defaults for corrupt or wrongly typed data', () => {
    localStorage.setItem(KEY, '{not json')
    expect(loadDevicePreferences()).toEqual(DEFAULT_DEVICE_PREFERENCES)
    localStorage.setItem(KEY, JSON.stringify({ sidebarOpen: 'no', formationBarOpen: false }))
    expect(loadDevicePreferences()).toEqual({ sidebarOpen: true, formationBarOpen: false, speakerDelayMs: 0 })
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
