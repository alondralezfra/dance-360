import { useSyncExternalStore } from 'react'

// Konva draws to a <canvas>, so it can't use Tailwind classes. This reads the
// same CSS variables the rest of the UI uses, so the stage follows the theme.

export interface CanvasTheme {
  floor: string
  outline: string
  grid: string
  gridCenter: string
  label: string
  dot: string
  dotStroke: string
  dotSelected: string
  dotSelectedStroke: string
  dotText: string
  dotLabel: string
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
    dot: v('--dot'),
    dotStroke: v('--dot-stroke'),
    dotSelected: v('--dot-selected'),
    dotSelectedStroke: v('--dot-selected-stroke'),
    dotText: v('--dot-text'),
    dotLabel: v('--dot-label'),
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
