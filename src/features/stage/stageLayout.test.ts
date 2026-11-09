import { describe, expect, it } from 'vitest'
import { crispLine, fitStage, MARGIN_X, MARGIN_Y, strokeFor } from './stageLayout'

const stage = { width: 40, depth: 24 }

describe('fitStage', () => {
  it('is limited by whichever of width or depth is tighter', () => {
    const wide = fitStage({ width: 1600, height: 400 }, stage)
    expect(wide.scale).toBeCloseTo((400 - MARGIN_Y * 2) / 24)
    const tall = fitStage({ width: 400, height: 1600 }, stage)
    expect(tall.scale).toBeCloseTo((400 - MARGIN_X * 2) / 40)
  })

  it('centres the stage', () => {
    const l = fitStage({ width: 1000, height: 600 }, stage)
    // Edges are snapped to whole device pixels (1 CSS px here), so centred to within one of them.
    expect(Math.abs(l.originX * 2 + l.stageW - 1000)).toBeLessThanOrEqual(1)
    expect(Math.abs(l.originY * 2 + l.stageH - 600)).toBeLessThanOrEqual(1)
  })

  it('never goes below 1 px per foot, even in a tiny or empty space', () => {
    expect(fitStage({ width: 10, height: 10 }, stage).scale).toBe(1)
    expect(fitStage({ width: 0, height: 0 }, stage).scale).toBe(1)
  })

  it('gets bigger when the space gets bigger (e.g. a panel is hidden)', () => {
    const before = fitStage({ width: 900, height: 500 }, stage)
    const after = fitStage({ width: 1200, height: 700 }, stage)
    expect(after.scale).toBeGreaterThan(before.scale)
  })
})

describe('device-pixel snapping', () => {
  const onGrid = (v: number, dpr: number) => Math.abs(v * dpr - Math.round(v * dpr)) < 1e-9

  it('snaps the stage edges to whole device pixels at any ratio', () => {
    for (const dpr of [1, 1.25, 1.5, 2, 2.5]) {
      for (const size of [{ width: 913, height: 517 }, { width: 1366.4, height: 640.7 }]) {
        const l = fitStage(size, stage, dpr)
        for (const v of [l.originX, l.originY, l.stageW, l.stageH]) expect(onGrid(v, dpr)).toBe(true)
      }
    }
  })

  it('stays centred to within a device pixel after snapping', () => {
    const l = fitStage({ width: 913, height: 517 }, stage, 1.25)
    expect(Math.abs(l.originX * 2 + l.stageW - 913)).toBeLessThanOrEqual(1 / 1.25)
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
