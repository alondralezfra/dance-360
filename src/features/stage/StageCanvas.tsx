import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type Konva from 'konva'
import { readableOn } from '../../lib/color'
import { partIdAt } from '../../model/parts'
import { positionsAt } from '../../model/playback'
import type { Dancer, Id } from '../../model/types'
import { useCanvasTheme, type CanvasTheme } from '../../theme/useCanvasTheme'
import { useCurrentFormation, useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'
import { usePlayhead } from './usePlayhead'

/** Dancer positions snap to this many feet when dropped. */
const SNAP_FEET = 0.5
/** Grid line spacing in feet. */
const GRID_FEET = 2
/** Dot diameter in feet. Kept below GRID_FEET so a dot always fits in a grid square. */
const DOT_FEET = 1.2
/** Minimum tappable size (pixels) around each dot, even when the dot is drawn smaller. */
const MIN_HIT_RADIUS = 16
/** Space around the stage (in pixels) for labels. */
const MARGIN = 36

const snap = (v: number) => Math.round(v / SNAP_FEET) * SNAP_FEET
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/** Track the pixel size of a container element so the canvas can fill it. */
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, size] as const
}

interface DancerDotProps {
  dancer: Dancer
  /** Position in pixels. */
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
  onSelect: () => void
  onDragStart: () => void
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void
}

/** One dancer on stage. It just draws where it's told; it knows nothing about timing. */
function DancerDot({
  dancer,
  x,
  y,
  radius,
  labelSize,
  fill,
  textColor,
  selected,
  theme,
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
      x={x}
      y={y}
      draggable
      onDragStart={() => {
        onDragStart()
        onSelect()
      }}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onMouseDown={onSelect}
      onTouchStart={onSelect}
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
        shadowColor="black"
        shadowOpacity={0.2}
        shadowBlur={3}
        shadowOffsetY={1}
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
          fontSize={radius * 0.85}
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
}

export function StageCanvas() {
  const [containerRef, size] = useElementSize<HTMLDivElement>()
  const theme = useCanvasTheme()
  const stage = useProject((s) => s.stage)
  const dancers = useProject((s) => s.dancers)
  const formations = useProject((s) => s.formations)
  const parts = useProject((s) => s.parts)
  const sections = useProject((s) => s.sections)
  const assignments = useProject((s) => s.assignments)
  const moveDancer = useProject((s) => s.moveDancer)
  const selectedDancerId = useUi((s) => s.selectedDancerId)
  const selectDancer = useUi((s) => s.selectDancer)
  const formation = useCurrentFormation()

  // Where everyone is right now. The playhead count is the selected formation's
  // count, animated across the transition when stepping between formations.
  const { count, settle } = usePlayhead(formations, formation)
  const positions = useMemo(() => positionsAt(formations, count), [formations, count])

  // Pixels per foot, chosen so the whole stage fits in the available space.
  const scale = Math.max(
    1,
    Math.min(
      (size.width - MARGIN * 2) / stage.width,
      (size.height - MARGIN * 2) / stage.depth,
    ),
  )
  const stageW = stage.width * scale
  const stageH = stage.depth * scale
  const originX = (size.width - stageW) / 2
  const originY = (size.height - stageH) / 2

  const toPx = (x: number, y: number) => ({
    x: originX + x * scale,
    y: originY + y * scale,
  })
  const toFeet = (px: number, py: number) => ({
    x: (px - originX) / scale,
    y: (py - originY) / scale,
  })

  // Dots and labels scale with the stage, so they shrink on smaller screens.
  const radius = (DOT_FEET / 2) * scale
  const labelSize = clamp(scale * 0.55, 8, 12)

  const gridLines = []
  for (let x = GRID_FEET; x < stage.width; x += GRID_FEET) {
    const isCenter = x === stage.width / 2
    gridLines.push(
      <Line
        key={`v${x}`}
        points={[toPx(x, 0).x, originY, toPx(x, 0).x, originY + stageH]}
        stroke={isCenter ? theme.gridCenter : theme.grid}
        strokeWidth={isCenter ? 1.5 : 1}
        dash={isCenter ? [6, 4] : undefined}
      />,
    )
  }
  for (let y = GRID_FEET; y < stage.depth; y += GRID_FEET) {
    gridLines.push(
      <Line
        key={`h${y}`}
        points={[originX, toPx(0, y).y, originX + stageW, toPx(0, y).y]}
        stroke={theme.grid}
        strokeWidth={1}
      />,
    )
  }

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    // Keep the dot on the stage while dragging.
    const node = e.target
    node.x(clamp(node.x(), originX, originX + stageW))
    node.y(clamp(node.y(), originY, originY + stageH))
  }

  const handleDragEnd = (dancerId: Id) => (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target
    const feet = toFeet(node.x(), node.y())
    const snapped = { x: snap(feet.x), y: snap(feet.y) }
    // Move the node to the snapped spot right away (the store update may not
    // trigger a re-render if the snapped spot is unchanged).
    node.position(toPx(snapped.x, snapped.y))
    moveDancer(formation.id, dancerId, snapped)
  }

  const clearSelectionOnEmpty = (e: Konva.KonvaEventObject<Event>) => {
    if (e.target === e.target.getStage() || e.target.name() === 'floor') {
      selectDancer(null)
    }
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {size.width > 0 && (
        <Stage
          width={size.width}
          height={size.height}
          onMouseDown={clearSelectionOnEmpty}
          onTouchStart={clearSelectionOnEmpty}
        >
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
              strokeWidth={2}
              cornerRadius={4}
            />
            {gridLines}
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

          <Layer>
            {dancers.map((d) => {
              const pos = positions[d.id]
              if (!pos) return null
              const px = toPx(pos.x, pos.y)
              // A dancer's colour is their part in the section the playhead is in.
              const partId = partIdAt(sections, parts, assignments, d.id, count)
              const part = parts.find((p) => p.id === partId)
              const fill = part ? theme.parts[part.color] : theme.unassigned
              return (
                <DancerDot
                  key={d.id}
                  dancer={d}
                  x={px.x}
                  y={px.y}
                  radius={radius}
                  labelSize={labelSize}
                  fill={fill}
                  textColor={part ? readableOn(fill) : theme.dotText}
                  selected={d.id === selectedDancerId}
                  theme={theme}
                  onSelect={() => selectDancer(d.id)}
                  onDragStart={settle}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd(d.id)}
                />
              )
            })}
          </Layer>
        </Stage>
      )}
      {dancers.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-lg bg-surface/90 px-4 py-2 text-sm text-muted-foreground shadow">
            Add dancers in the left panel to place them on stage.
          </p>
        </div>
      )}
    </div>
  )
}
