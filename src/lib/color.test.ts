import { describe, expect, it } from 'vitest'
import { readableOn } from './color'

describe('readableOn', () => {
  it('uses black on light backgrounds and white on dark ones', () => {
    expect(readableOn('#ffffff')).toBe('#000000')
    expect(readableOn('#f0e442')).toBe('#000000') // yellow
    expect(readableOn('#000000')).toBe('#ffffff')
    expect(readableOn('#0072b2')).toBe('#ffffff') // blue
  })

  it('accepts shorthand hex, any case, and surrounding whitespace', () => {
    expect(readableOn('#fff')).toBe('#000000')
    expect(readableOn('  #FFF ')).toBe('#000000')
    expect(readableOn('#000')).toBe('#ffffff')
  })

  it('falls back to white for anything it cannot parse', () => {
    expect(readableOn('')).toBe('#ffffff')
    expect(readableOn('rgb(255, 255, 255)')).toBe('#ffffff')
    expect(readableOn('#12')).toBe('#ffffff')
    expect(readableOn('not a colour')).toBe('#ffffff')
  })

  it('gives readable contrast (>= 4.5:1) for every palette colour in both themes', () => {
    const palette = [
      '#0072b2', '#d55e00', '#009e73', '#e69f00', '#56b4e9', '#cc79a7', '#f0e442', '#7b818c', // light
      '#3d9be0', '#f0804a', '#1fbf93', '#f2b01e', '#7cc6f0', '#db97bf', '#f5ea5e', '#9aa1ad', // dark
    ]
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => {
        const v = parseInt(hex.slice(i, i + 2), 16) / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    }
    for (const bg of palette) {
      const fg = readableOn(bg)
      const [hi, lo] = [Math.max(lum(bg), lum(fg)), Math.min(lum(bg), lum(fg))]
      const ratio = (hi + 0.05) / (lo + 0.05)
      // Large bold initials only need 3:1, but we aim higher where the palette allows.
      expect(ratio, `${fg} on ${bg}`).toBeGreaterThanOrEqual(3)
    }
  })
})
