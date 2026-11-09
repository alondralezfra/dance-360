// Reading a song file in the browser: its exact length and a summary of how loud
// it is over time (for the waveform). This is the only place that talks to the
// browser's audio engine for that; everything it hands on is plain data
// (decisions/0013). It knows nothing about projects, stores or screens.

import { peaksFromChannels, type Peaks } from '../model/peaks'

/** Decoded audio, as plain numbers. */
export interface DecodedAudio {
  channels: Float32Array[]
  sampleRate: number
}

/** Turns a song file's bytes into samples. Swappable so tests need no real audio engine. */
export type Decode = (data: ArrayBuffer) => Promise<DecodedAudio>

/**
 * Decode at a low sample rate on purpose: a waveform needs the loudness over time,
 * not CD quality, and a four-minute song then takes about 15MB instead of 85MB
 * while it is analysed, which matters on phones.
 */
export const ANALYSIS_SAMPLE_RATE = 8000

/** The file could not be read as audio (wrong type, damaged, or empty). */
export class UnreadableAudioError extends Error {
  constructor(message = 'That file could not be read as audio.') {
    super(message)
    this.name = 'UnreadableAudioError'
  }
}

/** The browser's decoder. The length given to the context does not limit how much audio is decoded. */
export const decodeWithBrowser: Decode = async (data) => {
  const context = new OfflineAudioContext(1, 1, ANALYSIS_SAMPLE_RATE)
  const buffer = await context.decodeAudioData(data)
  return {
    channels: Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i)),
    sampleRate: buffer.sampleRate,
  }
}

export interface Analysis {
  durationSec: number
  peaks: Peaks
}

/**
 * The song's exact length and its waveform peaks. Decoding takes the buffer over
 * (the browser empties it), so pass a copy if the bytes are needed afterwards.
 * Throws `UnreadableAudioError` if the file can't be decoded or holds no audio.
 */
export async function analyzeAudio(data: ArrayBuffer, decode: Decode = decodeWithBrowser): Promise<Analysis> {
  let decoded: DecodedAudio
  try {
    decoded = await decode(data)
  } catch {
    throw new UnreadableAudioError()
  }
  const peaks = peaksFromChannels(decoded.channels, decoded.sampleRate)
  if (peaks.data.length === 0) throw new UnreadableAudioError('That file does not seem to contain any audio.')
  const samples = decoded.channels.reduce((max, c) => Math.max(max, c.length), 0)
  return { durationSec: samples / decoded.sampleRate, peaks }
}
