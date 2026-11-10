import { describe, expect, it } from 'vitest'
import { fft } from './fft'

const spectrum = (signal: number[]) => {
  const re = Float64Array.from(signal)
  const im = new Float64Array(signal.length)
  fft(re, im)
  return { re, im, magnitude: Array.from(re, (r, i) => Math.hypot(r, im[i])) }
}

describe('fft', () => {
  it('puts a pure tone in the right frequency bin and nowhere else', () => {
    const n = 64
    const tone = Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 5 * i) / n)) // 5 cycles
    const { magnitude } = spectrum(tone)
    expect(magnitude[5]).toBeCloseTo(n / 2)
    expect(magnitude[n - 5]).toBeCloseTo(n / 2) // the mirror image
    magnitude.forEach((m, k) => {
      if (k !== 5 && k !== n - 5) expect(m).toBeLessThan(1e-9)
    })
  })

  it('a constant signal is all in bin 0', () => {
    const { magnitude } = spectrum(new Array(16).fill(0.5))
    expect(magnitude[0]).toBeCloseTo(8)
    expect(Math.max(...magnitude.slice(1))).toBeLessThan(1e-9)
  })

  it('a single spike has the same strength at every frequency', () => {
    const { magnitude } = spectrum([1, 0, 0, 0, 0, 0, 0, 0])
    magnitude.forEach((m) => expect(m).toBeCloseTo(1))
  })

  it('matches a direct calculation of the transform', () => {
    const signal = [0.3, -0.7, 0.1, 0.9, -0.2, 0.5, -0.4, 0.8]
    const { re, im } = spectrum(signal)
    signal.forEach((_, k) => {
      let sumRe = 0
      let sumIm = 0
      signal.forEach((x, t) => {
        sumRe += x * Math.cos((-2 * Math.PI * k * t) / signal.length)
        sumIm += x * Math.sin((-2 * Math.PI * k * t) / signal.length)
      })
      expect(re[k]).toBeCloseTo(sumRe)
      expect(im[k]).toBeCloseTo(sumIm)
    })
  })

  it('keeps the signal energy (Parseval)', () => {
    const signal = Array.from({ length: 32 }, (_, i) => Math.sin(i * 1.3) + Math.cos(i * 0.4))
    const { magnitude } = spectrum(signal)
    const time = signal.reduce((sum, x) => sum + x * x, 0)
    const freq = magnitude.reduce((sum, m) => sum + m * m, 0) / signal.length
    expect(freq).toBeCloseTo(time)
  })

  it('works on a single sample', () => {
    const re = Float64Array.from([3])
    const im = new Float64Array(1)
    fft(re, im)
    expect(re[0]).toBe(3)
  })

  it('refuses a length that is not a power of two, or mismatched arrays', () => {
    expect(() => fft(new Float32Array(6), new Float32Array(6))).toThrow(/power-of-two/)
    expect(() => fft(new Float32Array(8), new Float32Array(4))).toThrow(/power-of-two/)
    expect(() => fft(new Float32Array(0), new Float32Array(0))).toThrow()
  })
})
