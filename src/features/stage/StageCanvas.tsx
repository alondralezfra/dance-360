import { useCallback, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { Layer, Stage } from 'react-konva'
import type Konva from 'konva'
import { readableOn } from '../../lib/color'
import { snapToDevice } from '../../lib/devicePixels'
import { useDevicePixelRatio } from '../../lib/useDevicePixelRatio'
import { useElementSize } from '../../lib/useElementSize'
import { partIdAt, sectionIndexAt } from '../../model/parts'
import { positionsAt } from '../../model/playback'
import type { Id } from '../../model/types'
import { useCanvasTheme } from '../../theme/useCanvasTheme'
import { useCurrentFormation, useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'
import { playheadClock, useTransport } from '../../store/transport'
import { DancerDot } from './DancerDot'
import { StageFloor } from './StageFloor'
import { fitStage } from './stageLayout'
import { useDotMotion } from './useDotMotion'
import { usePlayhead } from './usePlayhead'

/** Dancer positions snap to this many feet when dropped. */
const SNAP_FEET = 0.5
/** Dot diameter in feet. Kept below the grid spacing (2 ft) so a dot always fits in a grid square. */
const DOT_FEET = 1.2

const snap = (v: number) => Math.round(v / SNAP_FEET) * SNAP_FEET
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/**
 * The stage: floor, grid and dancers.
 *
 * Performance shape (see docs/features/stage.md): this component renders when
 * something *structural* changes (an edit, the selection, the size, entering a new
 * section), never once per animation frame. Frame-by-frame motion goes through the
 * playhead clock and `useDotMotion`, which moves the dots on the canvas directly.
 */
export function StageCanvas() {
  const [containerRef, size] = useElementSize<HTMLDivElement>()
  const theme = useCanvasTheme()
  const dpr = useDevicePixelRatio()
  const stageRef = useRef<Konva.Stage>(null)
  const dancerLayerRef = useRef<Konva.Layer>(null)
  // Konva reads the pixel ratio once, when a layer is created. After browser zoom (which changes it)
  // the layers would keep their old resolution and the browser would stretch them: blurry text and lines.
  useLayoutEffect(() => {
    for (const layer of stageRef.current?.getLayers() ?? []) {
      layer.getCanvas().setPixelRatio(dpr)
      layer.batchDraw()
    }
  }, [dpr])
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

  // Pixels per foot, chosen so the whole stage fits in the available space.
  const layout = fitStage(size, stage, dpr)
  const { scale, stageW, stageH, originX, originY } = layout

  // Dots are drawn on whole device pixels so their edges and text stay sharp.
  const toDotPx = (x: number, y: number) => ({
    x: snapToDevice(originX + x * scale, dpr),
    y: snapToDevice(originY + y * scale, dpr),
  })

  // The count the stage is showing, kept outside React. A glide moves it every
  // frame; the dots follow it directly (useDotMotion). Order matters: the motion
  // hook must run before the one that starts a glide.
  const clock = playheadClock // shared with the timeline and driven by the song while it plays (store/transport.ts)
  const playing = useTransport((s) => s.playing)
  const selectionSource = useUi((s) => s.selectionSource)
  const registerDot = useDotMotion({ clock, formations, toDotPx, layerRef: dancerLayerRef })
  const { settle } = usePlayhead(clock, formations, formation, {
    frozen: playing,
    followedPlayhead: selectionSource === 'playhead',
  })
  // Grabbing a dot stops the song and settles on the selected formation, so the dot you move is in that formation.
  const handleDragStart = useCallback(() => {
    useTransport.getState().pause()
    settle()
  }, [settle])

  // React only learns which section the playhead is in (that decides the dot
  // colours), so it re-renders when a glide crosses a section boundary, not every frame.
  const sectionIndex = useSyncExternalStore(clock.subscribe, () => sectionIndexAt(sections, clock.get()))
  const sectionStart = sections[sectionIndex]?.startCount ?? 0

  // Where each dot is when this renders: wherever the playhead is (usually on the selected formation, but
  // it can be part-way along a transition after the song is paused). While it moves, the dots are moved directly.
  const playheadCount = clock.get()
  const resting = useMemo(() => positionsAt(formations, playheadCount), [formations, playheadCount])

  // Each dancer's colours in the current section, worked out once per change, not per frame.
  const looks = useMemo(
    () =>
      new Map(
        dancers.map((d) => {
          const partId = partIdAt(sections, parts, assignments, d.id, sectionStart)
          const part = parts.find((p) => p.id === partId)
          const fill = part ? theme.parts[part.color] : theme.unassigned
          return [d.id, { fill, textColor: part ? readableOn(fill) : theme.dotText }] as const
        }),
      ),
    [dancers, sections, parts, assignments, sectionStart, theme],
  )

  // Dots and labels scale with the stage, so they shrink on smaller screens.
  const radius = snapToDevice((DOT_FEET / 2) * scale, dpr)
  const labelSize = Math.round(clamp(scale * 0.55, 8, 12))

  // Stable handlers, so memoised dots are not re-rendered by unrelated changes.
  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      // Keep the dot on the stage while dragging.
      const node = e.target
      node.x(clamp(node.x(), originX, originX + stageW))
      node.y(clamp(node.y(), originY, originY + stageH))
    },
    [originX, originY, stageW, stageH],
  )

  const handleDragEnd = useCallback(
    (dancerId: Id, e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target
      const snapped = { x: snap((node.x() - originX) / scale), y: snap((node.y() - originY) / scale) }
      // Move the node to the snapped spot right away (the store update may not
      // trigger a re-render if the snapped spot is unchanged).
      node.position({
        x: snapToDevice(originX + snapped.x * scale, dpr),
        y: snapToDevice(originY + snapped.y * scale, dpr),
      })
      moveDancer(formation.id, dancerId, snapped)
    },
    [originX, originY, scale, dpr, formation.id, moveDancer],
  )

  const clearSelectionOnEmpty = (e: Konva.KonvaEventObject<Event>) => {
    if (e.target === e.target.getStage() || e.target.name() === 'floor') {
      selectDancer(null)
    }
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {size.width > 0 && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          onMouseDown={clearSelectionOnEmpty}
          onTouchStart={clearSelectionOnEmpty}
        >
          <StageFloor layout={layout} stage={stage} theme={theme} dpr={dpr} />

          <Layer ref={dancerLayerRef}>
            {dancers.map((d) => {
              const pos = resting[d.id]
              if (!pos) return null
              const px = toDotPx(pos.x, pos.y)
              const look = looks.get(d.id)!
              return (
                <DancerDot
                  key={d.id}
                  dancer={d}
                  x={px.x}
                  y={px.y}
                  radius={radius}
                  labelSize={labelSize}
                  fill={look.fill}
                  textColor={look.textColor}
                  selected={d.id === selectedDancerId}
                  theme={theme}
                  onNode={registerDot}
                  onSelect={selectDancer}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
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
