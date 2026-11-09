import { IconButton } from '../../components/ui/IconButton'
import { NumberField } from '../../components/ui/NumberField'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useProject } from '../../store/projectStore'

/** One nudge of the start point, in seconds: fine enough to line a beat up by ear. */
const NUDGE_SEC = 0.01
const MAX_START_SEC = 3600

const round3 = (n: number) => Math.round(n * 1000) / 1000

/**
 * How fast the counts go, and when in the song Set 1 Count 1 lands. Those two
 * numbers line the counts up with the music (the tempo map, plan §2).
 */
export function TempoSection() {
  const tempo = useProject((s) => s.tempo)
  const setTempo = useProject((s) => s.setTempo)

  const nudge = (by: number) =>
    setTempo({ ...tempo, startOffsetSec: round3(Math.min(Math.max(tempo.startOffsetSec + by, 0), MAX_START_SEC)) })

  return (
    <section aria-labelledby="tempo-heading">
      <SectionHeader id="tempo-heading" title="Tempo">
        How fast the counts go, and the moment in the song when Set 1, Count 1 lands. Together they line the counts up
        with the music.
      </SectionHeader>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <NumberField
          label="BPM"
          value={tempo.bpm}
          min={20}
          max={300}
          decimals={1}
          onCommit={(bpm) => setTempo({ ...tempo, bpm })}
        />
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
    </section>
  )
}
