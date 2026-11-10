import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { NumberField } from '../../components/ui/NumberField'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useProject } from '../../store/projectStore'
import { useSong } from '../../store/songStore'

/** One nudge of the start point, in seconds: fine enough to line a beat up by ear. */
const NUDGE_SEC = 0.01
const MAX_START_SEC = 3600
const MIN_BPM = 20
const MAX_BPM = 300

const round3 = (n: number) => Math.round(n * 1000) / 1000

/**
 * How fast the counts go, and when in the song Set 1 Count 1 lands. Those two
 * numbers line the counts up with the music (the tempo map, plan §2).
 */
export function TempoSection() {
  const tempo = useProject((s) => s.tempo)
  const setTempo = useProject((s) => s.setTempo)
  const song = useProject((s) => s.song)
  const file = useSong((s) => s.file)
  const busy = useSong((s) => s.busy)
  const note = useSong((s) => s.tempoNote)
  const acceptEstimate = useSong((s) => s.acceptEstimate)
  const estimateFromSong = useSong((s) => s.estimateFromSong)
  const shownNote = song && note && note.hash === song.hash ? note : null

  const scaleBpm = (factor: number) =>
    setTempo({ ...tempo, bpm: Math.min(Math.max(Math.round(tempo.bpm * factor * 10) / 10, MIN_BPM), MAX_BPM) })

  const nudge = (by: number) =>
    setTempo({ ...tempo, startOffsetSec: round3(Math.min(Math.max(tempo.startOffsetSec + by, 0), MAX_START_SEC)) })

  return (
    <section aria-labelledby="tempo-heading">
      <SectionHeader
        id="tempo-heading"
        title="Tempo"
        actions={
          song && file === 'present' ? (
            <Button onClick={() => void estimateFromSong()} disabled={busy}>
              Estimate from song
            </Button>
          ) : undefined
        }
      >
        How fast the counts go, and the moment in the song when Set 1, Count 1 lands. Together they line the counts up
        with the music.
      </SectionHeader>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <NumberField
          label="BPM"
          value={tempo.bpm}
          min={MIN_BPM}
          max={MAX_BPM}
          decimals={1}
          onCommit={(bpm) => setTempo({ ...tempo, bpm })}
        />
        {/* The estimate is often exactly half or double the tempo you count to. */}
        <div className="flex items-center gap-2">
          <Button onClick={() => scaleBpm(0.5)} disabled={tempo.bpm / 2 < MIN_BPM} aria-label="Half the BPM">
            Half
          </Button>
          <Button onClick={() => scaleBpm(2)} disabled={tempo.bpm * 2 > MAX_BPM} aria-label="Double the BPM">
            Double
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <NumberField
            label="Start point (seconds)"
            value={tempo.startOffsetSec}
            min={0}
            max={MAX_START_SEC}
            decimals={3}
            onCommit={(startOffsetSec) => setTempo({ ...tempo, startOffsetSec })}
          />
          <IconButton
            icon="minus"
            label={`Start ${NUDGE_SEC} seconds earlier`}
            disabled={tempo.startOffsetSec <= 0}
            onClick={() => nudge(-NUDGE_SEC)}
          />
          <IconButton
            icon="plus"
            label={`Start ${NUDGE_SEC} seconds later`}
            disabled={tempo.startOffsetSec >= MAX_START_SEC}
            onClick={() => nudge(NUDGE_SEC)}
          />
        </div>
      </div>

      {shownNote && (
        <div role="status" className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-primary-soft p-3 text-sm text-primary-soft-foreground">
          <p className="min-w-0 flex-1 basis-64">
            {shownNote.kind === 'applied' &&
              `Estimated from the song: ${shownNote.estimate!.bpm} BPM, with the first beat at ${shownNote.estimate!.startOffsetSec} s. It is an estimate: check it against the waveform below and change anything that looks off. If it is half or double what you count to, use Half or Double.`}
            {shownNote.kind === 'suggested' &&
              `This song sounds like ${shownNote.estimate!.bpm} BPM with the first beat at ${shownNote.estimate!.startOffsetSec} s, which differs from your tempo, so nothing was changed.`}
            {shownNote.kind === 'unclear' &&
              'Could not tell the tempo from this song (no steady beat found). Set it by hand.'}
          </p>
          {shownNote.kind === 'suggested' && (
            <Button variant="primary" onClick={acceptEstimate}>
              Use this tempo
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
