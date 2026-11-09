import { describe, expect, it } from 'vitest'
import { crispLine, snapToDevice, strokeFor } from './devicePixels'

const onGrid = (v: number, dpr: number) => Math.abs(v * dpr - Math.round(v * dpr)) < 1e-9

describe('device-pixel snapping', () => {
  it('snaps a length to a whole number of device pixels', () => {
    for (const dpr of [1, 1.25, 1.5, 2, 2.5]) {
      for (const v of [0, 0.3, 10.37, 913.6]) expect(onGrid(snapToDevice(v, dpr), dpr)).toBe(true)
    }
    expect(snapToDevice(10.4, 1)).toBe(10)
    expect(snapToDevice(10.4, 2)).toBe(10.5)
  })

  it('draws strokes in whole device pixels, at least one', () => {
    expect(strokeFor(1, 1.25)).toBeCloseTo(1 / 1.25)
    expect(strokeFor(1.5, 2)).toBe(1.5)
    expect(strokeFor(0.1, 3)).toBeCloseTo(1 / 3)
  })

  it('puts both edges of a line on device pixel boundaries', () => {
    for (const dpr of [1, 1.25, 1.5, 2]) {
      for (const v of [10.3, 57.77, 100]) {
        const stroke = strokeFor(1, dpr)
        const centre = crispLine(v, stroke, dpr)
        expect(onGrid(centre - stroke / 2, dpr)).toBe(true)
        expect(onGrid(centre + stroke / 2, dpr)).toBe(true)
        expect(Math.abs(centre - v)).toBeLessThanOrEqual(1 / dpr) // moves it by under a device pixel
      }
    }
  })
})
