/**
 * An in-place fast Fourier transform (radix 2) of a signal given as separate real
 * and imaginary parts. Both arrays must be the same power-of-two length. After the
 * call they hold the frequency spectrum (bin k is k * sampleRate / length Hz).
 * Used to see which frequencies are present in a short slice of audio.
 */
export function fft(re: Float32Array | Float64Array, im: Float32Array | Float64Array): void {
  const n = re.length
  if (n !== im.length || n < 1 || (n & (n - 1)) !== 0) {
    throw new Error('fft needs real and imaginary arrays of the same power-of-two length')
  }

  // Put the samples in bit-reversed order.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }

  // Combine pairs, then pairs of pairs, and so on.
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1
    const angle = (-2 * Math.PI) / size
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const cos = Math.cos(angle * k)
        const sin = Math.sin(angle * k)
        const a = start + k
        const b = a + half
        const tr = re[b] * cos - im[b] * sin
        const ti = re[b] * sin + im[b] * cos
        re[b] = re[a] - tr
        im[b] = im[a] - ti
        re[a] += tr
        im[a] += ti
      }
    }
  }
}
