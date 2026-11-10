import { describe, expect, it } from 'vitest'
import type { Peaks } from '../../model/peaks'
import { countToX } from '../../model/timeline'
import type { Formation } from '../../model/types'
import { drawTimeline, RULER_HEIGHT, type TimelineDrawing } from './drawTimeline'

interface Op {
  type: string
  args: number[] | [string, number, number]
  fill: string
  stroke: string
  lineWidth: number
}

/** A stand-in canvas context that records what is drawn and in which colour. */
function fakeContext() {
  const ops: Op[] = []
  const state: Record<string, unknown> = { fillStyle: '', strokeStyle: '', lineWidth: 0 }
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop]
      return (...args: Op['args']) =>
        ops.push({ type: prop, args, fill: target.fillStyle as string, stroke: target.strokeStyle as string, lineWidth: target.lineWidth as number })
    },
    set(target, prop: string, value) {
      target[prop] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, ops }
}

const theme = {
  floor: 'FLOOR',
  outline: 'OUTLINE',
  grid: 'GRID',
  gridCenter: 'SET',
  label: 'LABEL',
  wave: 'WAVE',
  marker: 'MARKER',
  playhead: 'PLAYHEAD',
}
const f = (id: string, count: number): Formation => ({ id, name: id, count, transitionCounts: 4, positions: {} })
const tempo = { bpm: 120, startOffsetSec: 0, changes: [] } // 2 counts per second

const base = (over: Partial<TimelineDrawing> = {}): TimelineDrawing => ({
  width: 400,
  height: 200,
  dpr: 1,
  view: { startCount: 0, pxPerCount: 20 }, // 40px per second
  tempo,
  formations: [],
  peaks: null,
  playhead: null,
  theme,
  ...over,
})

const draw = (d: TimelineDrawing) => {
  const { ctx, ops } = fakeContext()
  drawTimeline(ctx, d)
  return ops
}
const texts = (ops: Op[]) => ops.filter((o) => o.type === 'fillText').map((o) => o.args[0] as string)
const waveBars = (ops: Op[]) => ops.filter((o) => o.type === 'fillRect' && o.fill === 'WAVE')

// Loud in the first second only (100 slices per second)
const loudFirstSecond: Peaks = {
  perSecond: 100,
  data: Uint8Array.from([...new Array(100).fill(255), ...new Array(100).fill(0)]),
}

describe('drawTimeline', () => {
  it('starts by painting the background', () => {
    const [first] = draw(base())
    expect(first).toMatchObject({ type: 'fillRect', args: [0, 0, 400, 200], fill: 'FLOOR' })
  })

  describe('waveform', () => {
    it('is drawn only where the song makes sound, lined up with the counts', () => {
      const bars = waveBars(draw(base({ peaks: loudFirstSecond })))
      const xs = bars.map((b) => b.args[0] as number)
      expect(xs.length).toBeGreaterThan(30)
      expect(Math.min(...xs)).toBe(0)
      expect(Math.max(...xs)).toBeLessThanOrEqual(40) // one second = 2 counts = 40px
    })

    it('moves with the start point: a song that starts before count 0 shows up to the left of it', () => {
      const aligned = { ...tempo, startOffsetSec: 1 } // the sound is in the second BEFORE count 0
      expect(waveBars(draw(base({ peaks: loudFirstSecond, tempo: aligned })))).toHaveLength(0)
      const scrolledLeft = draw(base({ peaks: loudFirstSecond, tempo: aligned, view: { startCount: -2, pxPerCount: 20 } }))
      const xs = waveBars(scrolledLeft).map((b) => b.args[0] as number)
      expect(Math.min(...xs)).toBe(0)
      expect(Math.max(...xs)).toBeLessThanOrEqual(40)
    })

    it('draws louder parts taller, and centred in the area below the ruler', () => {
      const peaks: Peaks = { perSecond: 100, data: Uint8Array.from([...new Array(100).fill(255), ...new Array(100).fill(64)]) }
      const bars = waveBars(draw(base({ peaks })))
      const loud = bars.find((b) => (b.args[0] as number) < 30)!
      const quiet = bars.find((b) => (b.args[0] as number) > 45)!
      expect(loud.args[3] as number).toBeGreaterThan((quiet.args[3] as number) * 2)
      const middle = RULER_HEIGHT + (200 - RULER_HEIGHT) / 2
      expect((loud.args[1] as number) + (loud.args[3] as number) / 2).toBeCloseTo(middle)
    })

    it('is left out with no song (or no file), but the counts are still drawn', () => {
      const ops = draw(base({ peaks: null }))
      expect(waveBars(ops)).toHaveLength(0)
      expect(ops.some((o) => o.type === 'stroke')).toBe(true)
    })

    it('is left out when the song is silent', () => {
      const silent: Peaks = { perSecond: 100, data: new Uint8Array(500) }
      expect(waveBars(draw(base({ peaks: silent })))).toHaveLength(0)
    })

    it('copes with a drawing area too short for it', () => {
      expect(() => draw(base({ height: RULER_HEIGHT, peaks: loudFirstSecond }))).not.toThrow()
      expect(waveBars(draw(base({ height: 10, peaks: loudFirstSecond })))).toHaveLength(0)
    })
  })

  describe('grid and numbers', () => {
    it('labels every set when there is room', () => {
      expect(texts(draw(base({ view: { startCount: 0, pxPerCount: 8 } })))).toEqual(expect.arrayContaining(['Set 1', 'Set 2']))
    })

    it('thins the set labels out when zoomed out, never letting them crowd', () => {
      const ops = draw(base({ width: 1000, view: { startCount: 0, pxPerCount: 2 } })) // sets 16px apart
      const labels = ops.filter((o) => o.type === 'fillText' && String(o.args[0]).startsWith('Set'))
      const numbers = labels.map((l) => Number(String(l.args[0]).replace('Set ', '')))
      expect(numbers[0]).toBe(1)
      expect(numbers.length).toBeGreaterThan(3) // still labelled, just not every set
      expect(numbers.length).toBeLessThan(1000 / 16) // but not every set
      const xs = labels.map((l) => l.args[1] as number)
      for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(52)
    })

    it('labels the same sets whatever the scroll position, so labels do not flicker as you pan', () => {
      const labelled = (startCount: number) =>
        new Set(
          draw(base({ width: 1000, view: { startCount, pxPerCount: 2 } }))
            .filter((o) => o.type === 'fillText' && String(o.args[0]).startsWith('Set'))
            .map((o) => o.args[0]),
        )
      const a = labelled(0)
      const b = labelled(40) // scrolled 20 sets along
      const shared = [...b].filter((label) => a.has(label))
      expect(shared.length).toBeGreaterThan(0)
      // every set labelled in the second view that was also on screen in the first is labelled in both
      for (const label of b) {
        const n = Number(String(label).replace('Set ', ''))
        if (n <= 62) expect(a.has(label)).toBe(true)
      }
    })

    it('numbers each count only when zoomed in enough', () => {
      const zoomedIn = texts(draw(base({ view: { startCount: 0, pxPerCount: 30 } })))
      expect(zoomedIn).toEqual(expect.arrayContaining(['1', '2', '3', '4', '5', '6', '7', '8']))
      expect(texts(draw(base({ view: { startCount: 0, pxPerCount: 10 } }))).filter((t) => /^\d$/.test(t))).toHaveLength(0)
    })

    it('draws set lines in the stronger colour than count lines', () => {
      const strokes = draw(base()).filter((o) => o.type === 'stroke')
      expect(strokes.some((s) => s.stroke === 'SET')).toBe(true)
      expect(strokes.some((s) => s.stroke === 'GRID')).toBe(true)
    })

    it('puts every grid line on whole device pixels at any pixel ratio', () => {
      for (const dpr of [1, 1.25, 2]) {
        const ops = draw(base({ dpr, view: { startCount: 0.3, pxPerCount: 20 } }))
        // vertical grid lines: a moveTo followed by a lineTo at the same x (not the horizontal ruler line or markers)
        const moves = ops.filter(
          (o, i) => o.type === 'moveTo' && ops[i + 1]?.type === 'lineTo' && ops[i + 1].args[0] === o.args[0] && o.stroke !== 'MARKER',
        )
        expect(moves.length).toBeGreaterThan(5)
        for (const move of moves) {
          const edge = ((move.args[0] as number) - move.lineWidth / 2) * dpr
          expect(Math.abs(edge - Math.round(edge))).toBeLessThan(1e-6)
        }
      }
    })
  })

  describe('the playhead', () => {
    const playheadOps = (ops: Op[]) => ops.filter((o) => o.stroke === 'PLAYHEAD' || o.fill === 'PLAYHEAD')

    it('is a line in its own colour at the count the song has reached', () => {
      const view = { startCount: 0, pxPerCount: 20 }
      const ops = draw(base({ view, playhead: 5 })) // x = 100
      const moves = ops.filter((o) => o.type === 'moveTo' && o.stroke === 'PLAYHEAD')
      expect(moves[0].args[0] as number).toBeCloseTo(100, 0) // the line (the arrow on top starts after it)
      expect(ops[ops.indexOf(moves[0]) + 1]).toMatchObject({ type: 'lineTo' })
      expect(ops[ops.indexOf(moves[0]) + 1].args[0]).toBe(moves[0].args[0]) // straight down
      expect(ops.some((o) => o.type === 'stroke' && o.stroke === 'PLAYHEAD')).toBe(true)
    })

    it('has a small arrow on top so it can be found at a glance', () => {
      const ops = draw(base({ playhead: 5 }))
      expect(ops.some((o) => o.type === 'fill' && o.fill === 'PLAYHEAD')).toBe(true)
    })

    it('follows fractions of a count, not just whole ones', () => {
      const view = { startCount: 0, pxPerCount: 20 }
      const at = (count: number) =>
        draw(base({ view, playhead: count })).find((o) => o.type === 'moveTo' && o.stroke === 'PLAYHEAD')!.args[0] as number
      expect(at(5.5) - at(5)).toBeGreaterThan(8)
      expect(at(5.5) - at(5)).toBeLessThan(12)
    })

    it('is not drawn when there is none, or when it is off screen', () => {
      expect(playheadOps(draw(base({ playhead: null })))).toHaveLength(0)
      expect(playheadOps(draw(base({ view: { startCount: 0, pxPerCount: 20 }, playhead: 500 })))).toHaveLength(0)
      expect(playheadOps(draw(base({ view: { startCount: 50, pxPerCount: 20 }, playhead: 3 })))).toHaveLength(0)
    })

    it('is drawn last, over the waveform, grid and markers', () => {
      const ops = draw(base({ peaks: loudFirstSecond, formations: [f('a', 0)], playhead: 5 }))
      const lastPlayhead = ops.map((o, i) => (o.stroke === 'PLAYHEAD' || o.fill === 'PLAYHEAD' ? i : -1)).filter((i) => i >= 0).at(-1)!
      const lastOther = ops.map((o, i) => (o.stroke !== 'PLAYHEAD' && o.fill !== 'PLAYHEAD' && o.type !== 'beginPath' ? i : -1)).filter((i) => i >= 0).at(-1)!
      expect(lastPlayhead).toBeGreaterThan(lastOther - 3)
      expect(ops.findIndex((o) => o.stroke === 'PLAYHEAD')).toBeGreaterThan(ops.findIndex((o) => o.stroke === 'MARKER'))
    })
  })

  describe('formation markers', () => {
    it('draws a numbered marker at each formation, in order', () => {
      const view = { startCount: 0, pxPerCount: 20 }
      const ops = draw(base({ view, formations: [f('a', 0), f('b', 8), f('c', 16)] }))
      const labels = ops.filter((o) => o.type === 'fillText' && ['1', '2', '3'].includes(o.args[0] as string) && o.fill === 'FLOOR')
      expect(labels.map((l) => l.args[0])).toEqual(['1', '2', '3'])
      // each badge sits on its count; the one at the very left edge is nudged in so it isn't cut off (radius 9 + 1)
      expect(labels.map((l) => l.args[1])).toEqual([10, countToX(8, view), countToX(16, view)])
    })

    it('draws markers in the marker colour', () => {
      const ops = draw(base({ formations: [f('a', 4)] }))
      expect(ops.some((o) => o.type === 'stroke' && o.stroke === 'MARKER')).toBe(true)
      expect(ops.some((o) => o.type === 'arc')).toBe(true)
    })

    it('keeps the number badge fully on screen when the marker is at the very edge', () => {
      const view = { startCount: 0, pxPerCount: 20 }
      const ops = draw(base({ view, formations: [f('a', 0), f('b', 20)] })) // x = 0 and x = 400 = the width
      const badges = ops.filter((o) => o.type === 'arc')
      expect(badges).toHaveLength(2)
      expect(badges[0].args[0] as number).toBeGreaterThanOrEqual(9) // not centred on 0
      expect((badges[1].args[0] as number) + 9).toBeLessThanOrEqual(400)
      // while the marker line itself stays exactly on its count
      const lines = ops.filter((o) => o.type === 'moveTo' && o.stroke === 'MARKER')
      expect((lines[0].args[0] as number)).toBeLessThanOrEqual(1)
    })

    it('skips markers that are off screen, but draws one just at the edge', () => {
      const view = { startCount: 0, pxPerCount: 20 } // 0 to 20 counts visible
      const ops = draw(base({ view, formations: [f('a', 100), f('b', 20), f('c', -50)] }))
      expect(ops.filter((o) => o.type === 'arc')).toHaveLength(1)
    })
  })
})
