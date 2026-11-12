// Measuring speaker delay by ear (decisions/0020). A steady click track plays through the
// same player as the song; the person taps on every click they hear; how much later than
// each click the player's position was at the tap is the delay (the speaker's, plus the
// small reaction time, which taps made along with a steady beat mostly cancel). Pure: the
// audio module plays the track, the screen supplies the tap times, this does the arithmetic.

/** Seconds between clicks (80 BPM: slow enough that a 300 ms Bluetooth delay is not mistaken for the next click). */
export const CLICK_SPACING_SEC = 0.75
/** How many clicks the track has. */
export const CLICK_COUNT = 12
/** Quiet lead-in before the first click, so the person is listening when it starts. */
export const CLICK_LEAD_SEC = 1
/** Taps matched to fewer clicks than this are not enough to trust. */
const MIN_MATCHED_TAPS = 5
/** The most delay the app will use (a long Bluetooth chain is well under this). */
export const MAX_SPEAKER_DELAY_MS = 1000

/** When each click of the track sounds, in seconds from the start of the track. */
export function clickTimes(): number[] {
  return Array.from({ length: CLICK_COUNT }, (_, i) => CLICK_LEAD_SEC + i * CLICK_SPACING_SEC)
}

/** How long the track plays: the last click and a moment to let it ring out. */
export const clickTrackLength = () => CLICK_LEAD_SEC + CLICK_COUNT * CLICK_SPACING_SEC + 0.5

/** The click track as samples (a short, sharp 1 kHz blip on each click). */
export function clickTrackSamples(sampleRate: number): Float32Array {
  const samples = new Float32Array(Math.ceil(clickTrackLength() * sampleRate))
  const length = Math.floor(0.03 * sampleRate)
  for (const at of clickTimes()) {
    const start = Math.round(at * sampleRate)
    for (let i = 0; i < length && start + i < samples.length; i++) {
      const fade = 1 - i / length
      samples[start + i] = 0.8 * fade * Math.sin((2 * Math.PI * 1000 * i) / sampleRate)
    }
  }
  return samples
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * The speaker delay, in whole milliseconds, from the player's position (seconds into the
 * track) at each tap. Each tap is matched to the click it is nearest to; one that is more
 * than a little *before* the click (an accident) or too long after it (a missed click, or
 * tapping on the next one) is ignored. The median is used so a stray tap cannot skew it.
 * Null when fewer than `MIN_MATCHED_TAPS` taps could be matched. Never negative.
 */
export function estimateSpeakerDelay(tapSecs: number[]): number | null {
  const clicks = clickTimes()
  const offsets: number[] = []
  for (const tap of tapSecs) {
    const nearest = clicks.reduce((best, c) => (Math.abs(tap - c) < Math.abs(tap - best) ? c : best), clicks[0])
    const offset = tap - nearest
    if (offset >= -0.15 && offset <= CLICK_SPACING_SEC / 2 + 0.1) offsets.push(offset)
  }
  if (offsets.length < MIN_MATCHED_TAPS) return null
  const ms = Math.round(median(offsets) * 1000)
  return Math.min(Math.max(ms, 0), MAX_SPEAKER_DELAY_MS)
}
