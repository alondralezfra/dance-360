import { describe, expect, it, vi } from 'vitest'
import { beatTrack, steadyTone, whiteNoise } from '../test/syntheticAudio'
import { analyzeAudio, UnreadableAudioError, type Decode } from './analyze'

const bytes = () => new ArrayBuffer(8)
const decodeTo = (channels: Float32Array[], sampleRate: number): Decode => async () => ({ channels, sampleRate })

describe('analyzeAudio', () => {
  it('gives the exact duration (samples over sample rate) and the waveform peaks', async () => {
    // 2.5 seconds at 8kHz
    const samples = new Float32Array(20000).fill(0.5)
    const { durationSec, peaks } = await analyzeAudio(bytes(), decodeTo([samples], 8000))
    expect(durationSec).toBe(2.5)
    expect(peaks.perSecond).toBe(100)
    expect(peaks.data).toHaveLength(250)
    expect(peaks.data[0]).toBe(255)
  })

  it('uses the longest channel for the duration', async () => {
    const { durationSec } = await analyzeAudio(bytes(), decodeTo([new Float32Array(8000), new Float32Array(16000)], 8000))
    expect(durationSec).toBe(2)
  })

  it('hands the decoder the bytes it was given', async () => {
    const decode = vi.fn(decodeTo([new Float32Array(8000).fill(1)], 8000))
    const data = bytes()
    await analyzeAudio(data, decode)
    expect(decode).toHaveBeenCalledWith(data)
  })

  it('reports an unreadable file when decoding fails', async () => {
    const failing: Decode = async () => {
      throw new DOMException('Unable to decode audio data', 'EncodingError')
    }
    await expect(analyzeAudio(bytes(), failing)).rejects.toBeInstanceOf(UnreadableAudioError)
  })

  it('reports a file that decodes to nothing as having no audio', async () => {
    await expect(analyzeAudio(bytes(), decodeTo([], 8000))).rejects.toThrow(/any audio/)
    await expect(analyzeAudio(bytes(), decodeTo([new Float32Array(0)], 8000))).rejects.toBeInstanceOf(
      UnreadableAudioError,
    )
  })

  it('treats a nonsense sample rate as unreadable instead of dividing by it', async () => {
    await expect(analyzeAudio(bytes(), decodeTo([new Float32Array(10)], 0))).rejects.toBeInstanceOf(
      UnreadableAudioError,
    )
  })

  describe('tempo', () => {
    it('estimates the tempo and first beat of a song with a clear beat', async () => {
      const { tempo } = await analyzeAudio(bytes(), decodeTo([beatTrack({ bpm: 128, seconds: 30, firstBeatSec: 0.5 })], 8000))
      expect(tempo).not.toBeNull()
      expect(Math.abs(tempo!.bpm - 128)).toBeLessThan(0.3)
      expect(Math.abs(tempo!.firstBeatSec - 0.5)).toBeLessThan(0.02)
    })

    it('is null when the beat is too unclear to report: noise, a held tone, or a very short clip', async () => {
      for (const samples of [whiteNoise(30), steadyTone(30), beatTrack({ bpm: 128, seconds: 4 })]) {
        expect((await analyzeAudio(bytes(), decodeTo([samples], 8000))).tempo).toBeNull()
      }
    })

    it('can be skipped when only the waveform is wanted (re-reading a file already attached)', async () => {
      const decode = decodeTo([beatTrack({ bpm: 128, seconds: 30 })], 8000)
      const { tempo, peaks } = await analyzeAudio(bytes(), decode, { estimateTempo: false })
      expect(tempo).toBeNull()
      expect(peaks.data.length).toBeGreaterThan(0)
    })

    it('does not change the length or waveform', async () => {
      const decode = decodeTo([beatTrack({ bpm: 100, seconds: 20 })], 8000)
      const withTempo = await analyzeAudio(bytes(), decode)
      const without = await analyzeAudio(bytes(), decode, { estimateTempo: false })
      expect(withTempo.durationSec).toBe(without.durationSec)
      expect(Array.from(withTempo.peaks.data)).toEqual(Array.from(without.peaks.data))
    })
  })

  it('the error names itself, so callers can tell it from other failures', () => {
    const error = new UnreadableAudioError()
    expect(error.name).toBe('UnreadableAudioError')
    expect(error.message).toMatch(/audio/)
  })
})
