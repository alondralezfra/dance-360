import { describe, expect, it } from 'vitest'
import { encodeWav } from './wav'

const text = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.slice(at, at + n))

describe('encodeWav', () => {
  const bytes = encodeWav(new Float32Array([0, 0.25, -0.25, 1, -1]), 8000)
  const view = new DataView(bytes.buffer)

  it('writes a valid mono 16-bit PCM header', () => {
    expect(text(bytes, 0, 4)).toBe('RIFF')
    expect(text(bytes, 8, 4)).toBe('WAVE')
    expect(text(bytes, 12, 4)).toBe('fmt ')
    expect(view.getUint16(20, true)).toBe(1) // PCM
    expect(view.getUint16(22, true)).toBe(1) // mono
    expect(view.getUint32(24, true)).toBe(8000)
    expect(view.getUint16(34, true)).toBe(16)
    expect(text(bytes, 36, 4)).toBe('data')
  })

  it('sizes the file and the data chunk to match the samples', () => {
    expect(bytes.length).toBe(44 + 5 * 2)
    expect(view.getUint32(4, true)).toBe(bytes.length - 8)
    expect(view.getUint32(40, true)).toBe(10)
  })

  it('stores the samples as 16-bit values, clipping anything out of range', () => {
    expect([0, 1, 2, 3, 4].map((i) => view.getInt16(44 + i * 2, true))).toEqual([0, 8192, -8192, 32767, -32767])
    const loud = new DataView(encodeWav(new Float32Array([3, -3]), 8000).buffer)
    expect([loud.getInt16(44, true), loud.getInt16(46, true)]).toEqual([32767, -32767])
  })

  it('makes a valid empty file from no samples', () => {
    expect(encodeWav(new Float32Array(0), 8000).length).toBe(44)
  })
})
