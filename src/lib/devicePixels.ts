// Drawing sharply on a canvas. A "device pixel" is a pixel of the physical screen,
// which is not a CSS pixel under browser zoom or display scaling. A line or text that
// lands between two device pixels is smeared across both, which looks blurry; these
// snap lengths and positions to whole device pixels. Shared by every canvas.

/** Round a CSS-pixel length to a whole number of device pixels. */
export const snapToDevice = (v: number, dpr: number) => Math.round(v * dpr) / dpr

/** A stroke width (CSS px) rounded to whole device pixels, at least one. */
export const strokeFor = (cssPx: number, dpr: number) => Math.max(1, Math.round(cssPx * dpr)) / dpr

/**
 * Where to centre a straight line of `stroke` CSS px so both its edges fall exactly on
 * device pixel boundaries (the line then draws sharp instead of half-covering two pixels).
 */
export function crispLine(v: number, stroke: number, dpr: number): number {
  const half = (stroke * dpr) / 2
  return (Math.round(v * dpr - half) + half) / dpr
}
