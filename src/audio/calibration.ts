// Measuring this device's speaker delay: plays a click track through the same player the song
// uses and notes where the player was at every tap. The arithmetic is in model/calibration.ts;
// this only plays and listens (decisions/0020).

import { clickTrackSamples, estimateSpeakerDelay } from '../model/calibration'
import { encodeWav } from '../model/wav'
import { createPlayerFromBlob, type Player } from './player'

const SAMPLE_RATE = 22050

export interface Calibration {
  /** Starts the click track. `onEnd` is called when it has finished. Rejects if the browser refuses to play (it wants a tap first). */
  start(onEnd: () => void): Promise<void>
  /** Notes a tap (does nothing unless the track is playing). */
  tap(): void
  /** How many taps have been noted so far. */
  taps(): number
  /** The delay the taps show, in whole milliseconds, or null if there were too few good ones. */
  result(): number | null
  /** Stops the track and forgets the taps; the calibration can be started again. */
  stop(): void
}

export function createCalibration(makePlayer: (blob: Blob) => Player = createPlayerFromBlob): Calibration {
  let player: Player | null = null
  let tapTimes: number[] = []

  const stop = () => {
    player?.dispose()
    player = null
    tapTimes = []
  }

  return {
    async start(onEnd) {
      stop()
      const blob = new Blob([encodeWav(clickTrackSamples(SAMPLE_RATE), SAMPLE_RATE)], { type: 'audio/wav' })
      const created = makePlayer(blob)
      player = created
      // The taps are kept when the track ends: the result is read after that. `stop` forgets them.
      created.onEnded(onEnd)
      try {
        await created.play()
      } catch (error) {
        stop()
        throw error
      }
    },
    tap() {
      if (player?.playing) tapTimes.push(player.time())
    },
    taps: () => tapTimes.length,
    result: () => estimateSpeakerDelay(tapTimes),
    stop,
  }
}
