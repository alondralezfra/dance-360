/** The SHA-256 of some bytes (a file, or a buffer), as lowercase hex. Identifies a song file wherever it is stored. */
export async function sha256Hex(data: Blob | ArrayBuffer): Promise<string> {
  const bytes = data instanceof Blob ? await data.arrayBuffer() : data
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
