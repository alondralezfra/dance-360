import { memo } from 'react'
import { Circle, Group, Text } from 'react-konva'
import type Konva from 'konva'
import type { Dancer, Id } from '../../model/types'
import type { CanvasTheme } from '../../theme/useCanvasTheme'

/** Minimum tappable size (pixels) around each dot, even when the dot is drawn smaller. */
const MIN_HIT_RADIUS = 16

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

interface DancerDotProps {
  dancer: Dancer
  /** Resting position in pixels. (During a glide the canvas moves the node directly; see useDotMotion.) */
  x: number
  y: number
  radius: number
  labelSize: number
  /** Dot colour: the dancer's part colour right now, or neutral if they have none. */
  fill: string
  /** Colour for the initials, chosen to be readable on `fill`. */
  textColor: string
  selected: boolean
  theme: CanvasTheme
  /** Hands the canvas node to whoever moves dots during a glide. Null when the dot goes away. */
  onNode: (id: Id, node: Konva.Group | null) => void
  onSelect: (id: Id) => void
  onDragStart: () => void
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void
  onDragEnd: (id: Id, e: Konva.KonvaEventObject<DragEvent>) => void
}

/**
 * One dancer on stage. It just draws where it's told; it knows nothing about timing.
 * Memoised, and every callback it receives is stable, so it re-renders only when
 * something about this dancer's own appearance changes.
 *
 * No drop shadow on purpose: Konva draws shadowed shapes through an extra
 * off-screen canvas, which was about half of each frame with ~100 dancers.
 */
export const DancerDot = memo(function DancerDot({
  dancer,
  x,
  y,
  radius,
  labelSize,
  fill,
  textColor,
  selected,
  theme,
  onNode,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: DancerDotProps) {
  // Invisible ring that enlarges the tap area when dots are drawn small.
  const hitStroke = Math.max(0, (MIN_HIT_RADIUS - radius) * 2)
  const showInitials = radius >= 9

  return (
    <Group
      ref={(node) => {
        onNode(dancer.id, node)
        return () => onNode(dancer.id, null)
      }}
      x={x}
      y={y}
      draggable
      onDragStart={() => {
        onDragStart()
        onSelect(dancer.id)
      }}
      onDragMove={onDragMove}
      onDragEnd={(e) => onDragEnd(dancer.id, e)}
      onMouseDown={() => onSelect(dancer.id)}
      onTouchStart={() => onSelect(dancer.id)}
      onMouseEnter={(e) => {
        const c = e.target.getStage()?.container()
        if (c) c.style.cursor = 'grab'
      }}
      onMouseLeave={(e) => {
        const c = e.target.getStage()?.container()
        if (c) c.style.cursor = 'default'
      }}
    >
      {selected && (
        <Circle
          radius={radius + 4}
          stroke={theme.dotSelected}
          strokeWidth={2.5}
          listening={false}
        />
      )}
      <Circle
        radius={radius}
        fill={fill}
        stroke={theme.dotOutline}
        strokeWidth={1}
        hitStrokeWidth={hitStroke}
      />
      {showInitials && (
        <Text
          text={initials(dancer.name)}
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
          align="center"
          verticalAlign="middle"
          fontSize={Math.round(radius * 0.85)}
          fontStyle="bold"
          fill={textColor}
          listening={false}
        />
      )}
      <Text
        text={dancer.name}
        x={-60}
        y={radius + 2}
        width={120}
        align="center"
        fontSize={labelSize}
        fill={theme.dotLabel}
        listening={false}
      />
    </Group>
  )
})
