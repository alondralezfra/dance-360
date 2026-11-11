/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// (read with the file system: the test runner replaces imported CSS with nothing)
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8').replaceAll('\r\n', '\n')

// The theme's colours must stay readable (decisions/0023). This reads the real tokens from index.css and
// checks the pairs the app puts text on, so a colour tweak that makes something hard to read fails here, in
// milliseconds, before the browser accessibility scan (e2e/accessibility.spec.ts) would catch it.
//   text          4.5 : 1   (WCAG 2.1 AA, normal-size text)
//   non-text      3   : 1   (icons and other things that carry meaning: WCAG 2.1 AA)

type Tokens = Record<string, string>

/** The colour tokens defined in the block that starts with `selector`. */
function tokensOf(selector: string): Tokens {
  const start = css.indexOf(selector)
  if (start === -1) throw new Error(`index.css has no ${selector} block`)
  const block = css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start))
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2].toLowerCase()]))
}

const channel = (v: number) => {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}
/** WCAG contrast ratio between two colours. */
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const themes = {
  light: tokensOf(':root[data-theme="light"]'),
  dark: tokensOf(':root[data-theme="dark"]'),
}

/** [text colour token, [background tokens it is used on]] */
const TEXT: [string, string[]][] = [
  ['foreground', ['background', 'surface', 'surface-hover', 'primary-soft', 'selected-soft']],
  ['muted-foreground', ['background', 'surface', 'surface-hover', 'primary-soft']],
  ['primary-foreground', ['primary', 'primary-hover']],
  ['primary-soft-foreground', ['primary-soft']],
  ['link', ['background', 'surface']],
  ['danger', ['background', 'surface', 'danger-soft']],
]
const NON_TEXT: [string, string[]][] = [['subtle-foreground', ['background', 'surface', 'primary-soft']]]

describe('contrast.test helpers', () => {
  it('measures black on white as 21 : 1 and a colour on itself as 1 : 1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#336699', '#336699')).toBeCloseTo(1, 5)
  })

  it('does not depend on which colour is passed first', () => {
    expect(contrast('#4f46e5', '#ffffff')).toBeCloseTo(contrast('#ffffff', '#4f46e5'), 10)
  })

  it('found the tokens of both themes', () => {
    for (const theme of Object.values(themes)) expect(Object.keys(theme).length).toBeGreaterThan(15)
  })
})

for (const [name, tokens] of Object.entries(themes)) {
  describe(`the ${name} theme`, () => {
    for (const [fg, backgrounds] of TEXT) {
      for (const bg of backgrounds) {
        it(`${fg} text on ${bg} is readable (4.5 : 1)`, () => {
          expect(tokens[fg], `--${fg} is not defined`).toBeDefined()
          expect(tokens[bg], `--${bg} is not defined`).toBeDefined()
          expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5)
        })
      }
    }
    for (const [fg, backgrounds] of NON_TEXT) {
      for (const bg of backgrounds) {
        it(`${fg} icons on ${bg} are visible (3 : 1)`, () => {
          expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(3)
        })
      }
    }
  })
}
