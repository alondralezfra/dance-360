import { useSyncExternalStore } from 'react'

/**
 * Listen for the screen's pixel ratio changing. Browser zoom (Ctrl +/-), moving
 * the window to another monitor and "display scaling" all change it. A media
 * query only fires for the ratio it was written with, so it is re-armed after
 * every change. Zoom also fires a window `resize`, which some browsers send
 * when the media query doesn't, so both are watched (the value only counts as
 * changed when the ratio really is different).
 */
function subscribe(onChange: () => void) {
  let query: MediaQueryList | null = null
  const arm = () => {
    query?.removeEventListener('change', handle)
    query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    query.addEventListener('change', handle)
  }
  const handle = () => {
    onChange()
    arm()
  }
  arm()
  window.addEventListener('resize', onChange)
  return () => {
    query?.removeEventListener('change', handle)
    window.removeEventListener('resize', onChange)
  }
}

const getRatio = () => window.devicePixelRatio || 1

/** The current device pixel ratio, kept up to date (re-renders when it changes). */
export function useDevicePixelRatio(): number {
  return useSyncExternalStore(subscribe, getRatio, () => 1)
}
