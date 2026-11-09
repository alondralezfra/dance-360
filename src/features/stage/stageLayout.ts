// Where the stage sits inside its canvas. Pure, so it can be tested and shared
// (the browser tests use it to find dots on screen). Everything is snapped to whole
// device pixels (see lib/devicePixels.ts) so it draws sharply.

import { snapToDevice } from '../../lib/devicePixels'

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
