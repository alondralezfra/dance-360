import { useSyncExternalStore } from 'react'
import { PART_COLOR_IDS } from '../model/parts'
import type { PartColorId } from '../model/types'

// Konva draws to a <canvas>, so it can't use Tailwind classes. This reads the
// same CSS variables the rest of the UI uses, so the stage follows the theme.

export interface CanvasTheme {
  floor: string
  outline: string
  grid: string
  gridCenter: string
  label: string
  /** The song waveform on the timeline. */
  wave: string
  /** Formation markers on the timeline. */
  marker: string
  /** The playhead on the timeline. */
  playhead: string
  /** Dot fill for a dancer with no part. */
  unassigned: string
  dotOutline: string
  /** The ring drawn around the selected dancer. */
  dotSelected: string
  dotText: string
  dotLabel: string
  /** Dot fill for each part colour. */
  parts: Record<PartColorId, string>
}

function read(): CanvasTheme {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(name).trim()
  return {
    floor: v('--stage-floor'),
    outline: v('--stage-outline'),
    grid: v('--stage-grid'),
    gridCenter: v('--stage-grid-center'),
    label: v('--stage-label'),
    wave: v('--timeline-wave'),
    marker: v('--timeline-marker'),
    playhead: v('--timeline-playhead'),
    unassigned: v('--dot-unassigned'),
    dotOutline: v('--dot-outline'),
    dotSelected: v('--dot-selected'),
    dotText: v('--dot-text'),
    dotLabel: v('--dot-label'),
    parts: Object.fromEntries(PART_COLOR_IDS.map((id) => [id, v(`--part-${id}`)])) as Record<PartColorId, string>,
  }
}

// Cache by theme name so the snapshot is referentially stable between renders.
let cache: { theme: string | undefined; value: CanvasTheme } | null = null

function getSnapshot(): CanvasTheme {
  const theme = document.documentElement.dataset.theme
  if (!cache || cache.theme !== theme) cache = { theme, value: read() }
  return cache.value
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  return () => observer.disconnect()
}

/** Current stage colors; re-renders the caller when the theme changes. */
export function useCanvasTheme(): CanvasTheme {
  return useSyncExternalStore(subscribe, getSnapshot)
}
