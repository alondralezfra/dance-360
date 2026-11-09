// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sha256Hex } from './hash'

const bytes = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer

describe('sha256Hex', () => {
  it('matches the known SHA-256 of "abc" and of nothing', async () => {
    expect(await sha256Hex(bytes('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(await sha256Hex(bytes(''))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('gives the same answer for a Blob as for its bytes', async () => {
    expect(await sha256Hex(new Blob(['abc']))).toBe(await sha256Hex(bytes('abc')))
  })

  it('differs for different content and is always 64 hex characters', async () => {
    const a = await sha256Hex(bytes('song one'))
    const b = await sha256Hex(bytes('song two'))
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })
})
