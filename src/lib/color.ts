/**
 * Black or white, whichever is easier to read on top of the given background
 * colour (used for initials drawn on part-coloured dots). Accepts #rgb or
 * #rrggbb; anything else falls back to white.
 */
export function readableOn(background: string): '#000000' | '#ffffff' {
  const hex = background.trim().replace(/^#/, '')
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return '#ffffff'

  const channel = (offset: number) => {
    const v = parseInt(full.slice(offset, offset + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
  // Pick whichever gives the higher WCAG contrast ratio.
  return (luminance + 0.05) / 0.05 > 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff'
}
