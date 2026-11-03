import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type Konva from 'konva'
import { useCurrentFormation, useProject } from '../model/store'
import type { Dancer, Id } from '../model/types'

/** Dancer positions snap to this many feet when dropped. */
const SNAP_FEET = 0.5
/** Grid line spacing in feet. */
const GRID_FEET = 2
/** Dot diameter in feet. Kept below GRID_FEET so a dot always fits in a grid square. */
const DOT_FEET = 1.2
/** Minimum tappable size (pixels) around each dot, even when the dot is drawn smaller. */
const MIN_HIT_RADIUS = 16
/** How long dots take to glide between formations (milliseconds). */
const GLIDE_MS = 700
/** Space around the stage (in pixels) for labels. */
const MARGIN = 36

const snap = (v: number) => Math.round(v / SNAP_FEET) * SNAP_FEET
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

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

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface DancerDotProps {
  dancer: Dancer
  formationId: Id
  /** Target position in pixels. */
  x: number
  y: number
  radius: number
  labelSize: number
  selected: boolean
  onSelect: () => void
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void
}

/**
 * One dancer on stage. Its position is managed here rather than through
 * props so that switching formations can glide the dot to its new spot.
 */
function DancerDot({
  dancer,
  formationId,
  x,
  y,
  radius,
  labelSize,
  selected,
  onSelect,
  onDragMove,
  onDragEnd,
}: DancerDotProps) {
  const groupRef = useRef<Konva.Group>(null)
  /** Where the dot is currently drawn (updates every animation frame). */
  const shown = useRef({ x, y })
  const lastFormationId = useRef(formationId)
  const frame = useRef<number | null>(null)

  const stopGlide = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
  }

  // useLayoutEffect runs before the browser paints, so there's no flicker.
  useLayoutEffect(() => {
    const node = groupRef.current
    if (!node) return
    const to = { x, y }
    const formationChanged = lastFormationId.current !== formationId
    lastFormationId.current = formationId

    const from = { ...shown.current }
    const distance = Math.hypot(to.x - from.x, to.y - from.y)

    // Only glide when switching formations. Dragging, resizing the window or
    // adding a dancer should move the dot immediately.
    if (!formationChanged || distance < 0.5 || prefersReducedMotion()) {
      // If a glide is still running from a formation switch, let it finish
      // unless the dot has a new target (e.g. the window was resized).
      if (frame.current !== null && !formationChanged && distance >= 0.5) stopGlide()
      if (frame.current === null) {
        node.position(to)
        shown.current = to
      }
      return
    }

    stopGlide()
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / GLIDE_MS)
      const k = easeInOut(t)
      const p = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k }
      node.position(p)
      shown.current = p
      node.getLayer()?.batchDraw()
      frame.current = t < 1 ? requestAnimationFrame(step) : null
    }
    frame.current = requestAnimationFrame(step)
  }, [x, y, formationId])

  useEffect(() => stopGlide, [])

  // Invisible ring that enlarges the tap area when dots are drawn small.
  const hitStroke = Math.max(0, (MIN_HIT_RADIUS - radius) * 2)
  const showInitials = radius >= 9

  return (
    <Group
      ref={groupRef}
      draggable
      onDragStart={() => {
        stopGlide()
        onSelect()
      }}
      onDragMove={(e) => {
        onDragMove(e)
        shown.current = e.target.position()
      }}
      onDragEnd={(e) => {
        onDragEnd(e)
        shown.current = e.target.position()
      }}
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
      <Circle
        radius={radius}
        fill={selected ? '#f59e0b' : '#6366f1'}
        stroke={selected ? '#92400e' : '#3730a3'}
        strokeWidth={selected ? 2 : 1}
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
          fill="#ffffff"
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
        fill="#334155"
        listening={false}
      />
    </Group>
  )
}

export function StageCanvas() {
  const [containerRef, size] = useElementSize<HTMLDivElement>()
  const stage = useProject((s) => s.stage)
  const dancers = useProject((s) => s.dancers)
  const selectedDancerId = useProject((s) => s.selectedDancerId)
  const selectDancer = useProject((s) => s.selectDancer)
  const moveDancer = useProject((s) => s.moveDancer)
  const formation = useCurrentFormation()

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
        stroke={isCenter ? '#94a3b8' : '#e2e8f0'}
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
        stroke="#e2e8f0"
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
              fill="#94a3b8"
              letterSpacing={2}
            />
            <Rect
              name="floor"
              x={originX}
              y={originY}
              width={stageW}
              height={stageH}
              fill="#ffffff"
              stroke="#334155"
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
              fill="#94a3b8"
              letterSpacing={2}
            />
          </Layer>

          <Layer>
            {dancers.map((d) => {
              const pos = formation.positions[d.id]
              if (!pos) return null
              const px = toPx(pos.x, pos.y)
              return (
                <DancerDot
                  key={d.id}
                  dancer={d}
                  formationId={formation.id}
                  x={px.x}
                  y={px.y}
                  radius={radius}
                  labelSize={labelSize}
                  selected={d.id === selectedDancerId}
                  onSelect={() => selectDancer(d.id)}
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
          <p className="rounded-lg bg-white/90 px-4 py-2 text-sm text-slate-500 shadow">
            Add dancers in the left panel to place them on stage.
          </p>
        </div>
      )}
    </div>
  )
}
