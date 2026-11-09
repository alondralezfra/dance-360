import { Button } from '../../components/ui/Button'
import { FileButton } from '../../components/ui/FileButton'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { formatBytes, formatDuration } from '../../lib/format'
import { useProject } from '../../store/projectStore'
import { useSong } from '../../store/songStore'

/** What the file picker offers. The extensions help devices that don't label audio files with a type. */
const ACCEPT = 'audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac'

/** The music for this dance: attach, replace or remove it, and see whether its file is on this device. */
export function SongSection() {
  const song = useProject((s) => s.song)
  const file = useSong((s) => s.file)
  const busy = useSong((s) => s.busy)
  const error = useSong((s) => s.error)
  const attach = useSong((s) => s.attach)
  const reattach = useSong((s) => s.reattach)
  const remove = useSong((s) => s.remove)
  const dismissError = useSong((s) => s.dismissError)

  const confirmRemove = () => {
    if (!song) return
    if (window.confirm(`Remove "${song.name}" from this project? Your formations and counts are not affected.`)) {
      void remove()
    }
  }

  return (
    <section aria-labelledby="song-heading">
      <SectionHeader
        id="song-heading"
        title="Song"
        actions={
          song ? (
            <div className="flex flex-wrap gap-2">
              <FileButton accept={ACCEPT} onFile={(f) => void attach(f)} disabled={busy}>
                Replace song
              </FileButton>
              <Button variant="danger" onClick={confirmRemove} disabled={busy}>
                Remove song
              </Button>
            </div>
          ) : (
            <FileButton variant="primary" accept={ACCEPT} onFile={(f) => void attach(f)} disabled={busy}>
              Attach song
            </FileButton>
          )
        }
      >
        The music this dance is set to. Counts work with or without it; the song adds a waveform to line formations up
        against.
      </SectionHeader>

      {busy && (
        <p role="status" className="mb-3 text-sm text-muted-foreground">
          Reading the song…
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-danger bg-danger-soft p-3 text-sm text-danger"
        >
          <p className="min-w-0 flex-1 basis-56">{error}</p>
          <Button variant="ghost" onClick={dismissError}>
            Dismiss
          </Button>
        </div>
      )}

      {song ? (
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="truncate font-medium">{song.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatDuration(song.durationSec)} · {formatBytes(song.size)}
          </p>

          {file === 'checking' && (
            <p role="status" className="mt-2 text-sm text-muted-foreground">
              Looking for the song on this device…
            </p>
          )}

          {file === 'missing' && (
            <div className="mt-3 flex flex-col items-start gap-2 rounded-md bg-selected-soft p-3">
              <p className="font-medium">The song file is not on this device.</p>
              <p className="text-sm">
                This project uses “{song.name}” ({formatBytes(song.size)}). Choose the same file again to see its
                waveform. Your formations and counts are safe either way.
              </p>
              <FileButton variant="primary" accept={ACCEPT} onFile={(f) => void reattach(f)} disabled={busy}>
                Choose the file again
              </FileButton>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
          No song yet. You can build formations without one and attach it later.
        </p>
      )}
    </section>
  )
}
