import { describe, expect, it } from 'vitest'
import { formatBytes, formatDuration } from './format'

describe('formatDuration', () => {
  it('writes minutes and two-digit seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(5)).toBe('0:05')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(201.4)).toBe('3:21')
  })

  it('rounds to the nearest second', () => {
    expect(formatDuration(59.6)).toBe('1:00')
    expect(formatDuration(59.4)).toBe('0:59')
  })

  it('adds hours for long recordings', () => {
    expect(formatDuration(3725)).toBe('1:02:05')
    expect(formatDuration(3600)).toBe('1:00:00')
  })

  it('never goes negative', () => {
    expect(formatDuration(-4)).toBe('0:00')
  })
})

describe('formatBytes', () => {
  it('uses the largest sensible unit', () => {
    expect(formatBytes(0)).toBe('0 bytes')
    expect(formatBytes(512)).toBe('512 bytes')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(830 * 1024)).toBe('830 KB')
    expect(formatBytes(4_812_345)).toBe('4.6 MB')
  })

  it('copes with a bad size', () => {
    expect(formatBytes(-5)).toBe('0 bytes')
  })
})
