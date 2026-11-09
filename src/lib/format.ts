/** A length of time as people read it: 201.4 seconds is "3:21", and an hour and a bit is "1:02:05". */
export function formatDuration(totalSeconds: number): string {
  const whole = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const seconds = String(whole % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}

/** A file size as people read it: "4.6 MB", "812 KB", "0 bytes". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.max(0, Math.round(bytes))} bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
