import { memo } from 'react'
import { Layer, Line, Rect, Text } from 'react-konva'
import type { CanvasTheme } from '../../theme/useCanvasTheme'
import { crispLine, strokeFor } from '../../lib/devicePixels'
import type { StageLayout } from './stageLayout'

/** Grid line spacing in feet. */
const GRID_FEET = 2

interface StageFloorProps {
  layout: StageLayout
  /** Stage size in feet. */
  stage: { width: number; depth: number }
  theme: CanvasTheme
  dpr: number
}

/**
 * The static part of the stage: floor, grid and labels. Memoised, so it is only
 * redrawn when the size, theme or pixel ratio changes, never while dancers move.
 */
export const StageFloor = memo(function StageFloor({ layout, stage, theme, dpr }: StageFloorProps) {
  const { scale, stageW, stageH, originX, originY } = layout
  const gridStroke = strokeFor(1, dpr)
  const centerStroke = strokeFor(1.5, dpr)

  const lines = []
  for (let x = GRID_FEET; x < stage.width; x += GRID_FEET) {
    const isCenter = x === stage.width / 2
    const width = isCenter ? centerStroke : gridStroke
    const px = crispLine(originX + x * scale, width, dpr)
    lines.push(
      <Line
        key={`v${x}`}
        points={[px, originY, px, originY + stageH]}
        stroke={isCenter ? theme.gridCenter : theme.grid}
        strokeWidth={width}
        dash={isCenter ? [6, 4] : undefined}
      />,
    )
  }
  for (let y = GRID_FEET; y < stage.depth; y += GRID_FEET) {
    const py = crispLine(originY + y * scale, gridStroke, dpr)
    lines.push(
      <Line
        key={`h${y}`}
        points={[originX, py, originX + stageW, py]}
        stroke={theme.grid}
        strokeWidth={gridStroke}
      />,
    )
  }

  return (
    <Layer>
      <Text
        text="UPSTAGE"
        x={originX}
        y={originY - 24}
        width={stageW}
        align="center"
        fontSize={12}
        fill={theme.label}
        letterSpacing={2}
      />
      <Rect
        name="floor"
        x={originX}
        y={originY}
        width={stageW}
        height={stageH}
        fill={theme.floor}
        stroke={theme.outline}
        strokeWidth={strokeFor(2, dpr)}
        cornerRadius={4}
      />
      {lines}
      <Text
        text="AUDIENCE"
        x={originX}
        y={originY + stageH + 12}
        width={stageW}
        align="center"
        fontSize={12}
        fill={theme.label}
        letterSpacing={2}
      />
    </Layer>
  )
})
