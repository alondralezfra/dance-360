// Playing a song. Wraps the browser's audio element and gives the rest of the app one
// thing it needs: where the song is, in seconds, right now, accurately enough to move
// dancers by. Knows nothing about counts, projects or screens (decisions/0013).

/** The parts of an `HTMLAudioElement` the player uses. A stand-in with these is enough for tests. */
export interface MediaLike {
  currentTime: number
  duration: number
  paused: boolean
  ended: boolean
  play(): Promise<void>
  pause(): void
  addEventListener(type: 'ended', listener: () => void): void
  removeEventListener(type: 'ended', listener: () => void): void
}

export interface Player {
  /** Starts (or resumes) playing. Rejects if the browser refuses (it wants a tap or click first). */
  play(): Promise<void>
  pause(): void
  /** Jumps to a moment in the song (clamped to its length). */
  seek(sec: number): void
  /** Where the song is, in seconds right now: the browser's position, smoothed between its updates. */
  time(): number
  /** True while sound is actually being played (not paused, not at the end). */
  readonly playing: boolean
  /** Calls `listener` when the song reaches its end. Returns the function that stops listening. */
  onEnded(listener: () => void): () => void
  /** Stops, lets go of the file, and stops listening. The player cannot be used afterwards. */
  dispose(): void
}

/**
 * The browser reports the position in coarse steps (on some devices every 100 ms or
 * more), but dots move every frame. Between reports the position is carried forward by
 * the real time that has passed, but never further than this: if the sound stalls
 * (buffering), the clock must not run on without it.
 */
const MAX_CARRY_SEC = 0.25

export function createPlayer(media: MediaLike, now: () => number = () => performance.now(), onDispose?: () => void): Player {
  let anchor = { position: media.currentTime, at: now() }
  const endedListeners = new Set<() => void>()
  const handleEnded = () => endedListeners.forEach((listener) => listener())
  media.addEventListener('ended', handleEnded)

  const playing = () => !media.paused && !media.ended
  const limit = (sec: number) => Math.min(Math.max(sec, 0), Number.isFinite(media.duration) ? media.duration : Infinity)

  return {
    async play() {
      anchor = { position: media.currentTime, at: now() }
      await media.play()
      anchor = { position: media.currentTime, at: now() }
    },

    pause() {
      media.pause()
    },

    seek(sec) {
      media.currentTime = limit(sec)
      anchor = { position: media.currentTime, at: now() }
    },

    time() {
      const reported = media.currentTime
      if (reported !== anchor.position) anchor = { position: reported, at: now() }
      if (!playing()) return reported
      return limit(anchor.position + Math.min((now() - anchor.at) / 1000, MAX_CARRY_SEC))
    },

    get playing() {
      return playing()
    },

    onEnded(listener) {
      endedListeners.add(listener)
      return () => {
        endedListeners.delete(listener)
      }
    },

    dispose() {
      media.pause()
      media.removeEventListener('ended', handleEnded)
      endedListeners.clear()
      onDispose?.()
    },
  }
}

/** A player for a song file: the file is played from a temporary address that is released when the player is. */
export function createPlayerFromBlob(blob: Blob): Player {
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.preload = 'auto'
  return createPlayer(audio, undefined, () => URL.revokeObjectURL(url))
}
