// Where the stage sits inside its canvas. Pure, so it can be tested and shared
// (the browser tests use it to find dots on screen).
//
// Everything is snapped to whole *device* pixels (a "pixel" on the physical screen,
// which is not a CSS pixel under browser zoom or display scaling). A line or text that
// lands between two device pixels is smeared across both, which is what looks blurry.

/** Space left and right of the stage, in CSS pixels. */
export const MARGIN_X = 20
/** Space above and below the stage, in CSS pixels: room for the UPSTAGE / AUDIENCE labels. */
export const MARGIN_Y = 32

export interface StageLayout {
  /** CSS pixels per foot. */
  scale: number
  originX: number
  originY: number
  stageW: number
  stageH: number
}

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

/** Scale the stage as large as fits (never below 1 px/ft), centre it, and snap its edges to device pixels. */
export function fitStage(
  size: { width: number; height: number },
  stage: { width: number; depth: number },
  dpr = 1,
): StageLayout {
  const scale = Math.max(
    1,
    Math.min((size.width - MARGIN_X * 2) / stage.width, (size.height - MARGIN_Y * 2) / stage.depth),
  )
  const stageW = snapToDevice(stage.width * scale, dpr)
  const stageH = snapToDevice(stage.depth * scale, dpr)
  return {
    scale,
    stageW,
    stageH,
    originX: snapToDevice((size.width - stageW) / 2, dpr),
    originY: snapToDevice((size.height - stageH) / 2, dpr),
  }
}
