// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadDevicePreferences } from '../persistence/devicePreferences'
import { useSpeaker } from './speakerStore'

beforeEach(() => {
  localStorage.clear()
  useSpeaker.setState({ delayMs: 0 })
})

describe('speaker delay', () => {
  it('starts at none', () => {
    expect(useSpeaker.getState().delayMs).toBe(0)
  })

  it('is remembered on this device, apart from the layout settings', () => {
    useSpeaker.getState().setDelayMs(240)
    expect(useSpeaker.getState().delayMs).toBe(240)
    expect(loadDevicePreferences()).toMatchObject({ speakerDelayMs: 240, sidebarOpen: true, formationBarOpen: true })
  })

  it('is kept a whole number inside its limits', () => {
    const { setDelayMs } = useSpeaker.getState()
    setDelayMs(180.4)
    expect(useSpeaker.getState().delayMs).toBe(180)
    setDelayMs(-20)
    expect(useSpeaker.getState().delayMs).toBe(0)
    setDelayMs(5000)
    expect(useSpeaker.getState().delayMs).toBe(1000)
    setDelayMs(Number.NaN)
    expect(useSpeaker.getState().delayMs).toBe(0)
  })
})
