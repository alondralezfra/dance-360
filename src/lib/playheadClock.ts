/**
 * The count the stage is showing right now, as a value outside React.
 *
 * During a glide (and later audio playback) the count changes every frame.
 * Routing that through React state re-renders the whole canvas 60 times a
 * second; instead whatever produces the count calls `set`, and the canvas
 * subscribes and moves the dots directly. React only hears about it when
 * something it renders actually changes (e.g. the playhead enters a new section).
 */
export interface PlayheadClock {
  get: () => number
  /** Moves the playhead. Subscribers are told only if the count really changed. */
  set: (count: number) => void
  /** Calls `listener` after every change. Returns the function that stops listening. */
  subscribe: (listener: () => void) => () => void
}

export function createPlayheadClock(initial: number): PlayheadClock {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set: (count) => {
      if (count === value) return
      value = count
      for (const listener of [...listeners]) listener()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
