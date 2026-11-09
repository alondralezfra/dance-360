// Waveform peaks: a small summary of how loud a song is over time, used to draw
// the timeline's waveform. Pure maths on sample data; decoding the audio file into
// samples is the browser's job (src/audio/), so this is testable without a browser.

/** One level (0 to 255) per slice of the song; slice i covers seconds i / perSecond to (i + 1) / perSecond. */
export interface Peaks {
  perSecond: number
  data: Uint8Array
}

/** Detail kept: enough to stay smooth when zoomed in to single counts, small enough to cache (about 24KB for 4 minutes). */
export const PEAKS_PER_SECOND = 100

/**
 * Summarise decoded audio: for each slice, the loudest sample across all
 * channels, scaled so the loudest slice in the song is 255 (a quiet recording
 * still shows its shape). Silence is all zeros. Bad input (no samples, or a
 * non-positive rate) gives an empty result rather than throwing.
 */
export function peaksFromChannels(
  channels: Float32Array[],
  sampleRate: number,
  perSecond = PEAKS_PER_SECOND,
): Peaks {
  const length = channels.reduce((max, c) => Math.max(max, c.length), 0)
  if (length === 0 || !(sampleRate > 0) || !(perSecond > 0)) return { perSecond, data: new Uint8Array(0) }

  const samplesPerSlice = sampleRate / perSecond
  const slices = Math.ceil(length / samplesPerSlice)
  const loudness = new Float32Array(slices)
  let loudest = 0

  for (const channel of channels) {
    for (let i = 0; i < channel.length; i++) {
      const slice = Math.min(Math.floor(i / samplesPerSlice), slices - 1)
      const level = Math.abs(channel[i])
      if (level > loudness[slice]) loudness[slice] = level
      if (level > loudest) loudest = level
    }
  }

  const data = new Uint8Array(slices)
  if (loudest > 0) for (let i = 0; i < slices; i++) data[i] = Math.round((loudness[i] / loudest) * 255)
  return { perSecond, data }
}

/** How long the summarised audio is, in seconds. */
export const peaksDuration = (peaks: Peaks) => peaks.data.length / peaks.perSecond

/**
 * The loudness (0 to 1) of the song between two moments: the loudest slice that
 * overlaps them. Outside the song, or for an empty song, it is 0.
 * (A waveform column covers a stretch of time, and this is what it draws.)
 */
export function levelBetween(peaks: Peaks, startSec: number, endSec: number): number {
  if (peaks.data.length === 0) return 0
  if (startSec >= peaksDuration(peaks) || endSec < 0) return 0
  const first = Math.max(0, Math.floor(startSec * peaks.perSecond))
  const last = Math.min(peaks.data.length - 1, Math.max(first, Math.ceil(endSec * peaks.perSecond) - 1))
  let level = 0
  for (let i = first; i <= last; i++) if (peaks.data[i] > level) level = peaks.data[i]
  return level / 255
}
