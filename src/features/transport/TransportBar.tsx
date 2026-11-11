import { useMemo, useSyncExternalStore } from 'react'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { Icon } from '../../components/ui/Icon'
import { Slider } from '../../components/ui/Slider'
import { cn } from '../../lib/cn'
import { formatCount } from '../../model/tempo'
import { timelineBounds } from '../../model/timeline'
import { useProject } from '../../store/projectStore'
import { playheadClock, useTransport } from '../../store/transport'

const NO_SONG_HINT = 'Attach a song on the Song tab to play it. You can still drag the slider to see the stage at any count.'
const MARK_HINT = 'To set when each formation starts: play the song and tap Mark (or press M) as each one should begin.'
const MARK_TITLE = 'Press Play, then tap this (or press M) when the next formation should start. It snaps to the nearest count.'

/** "Set 3 · Count 5", or a note for the part of the song before the dance starts. */
const readout = (count: number) => (count < 0 ? 'Before Set 1' : formatCount(count))

/**
 * Play and pause the song, see and drag the position, switch the metronome on. Used on the
 * Stage and the Song tab; both show the same playhead because there is only one.
 * `compact` (the Stage, where height is precious) drops the card around it and puts the hint in a tooltip.
 */
export function TransportBar({ compact = false }: { compact?: boolean }) {
  const song = useProject((s) => s.song)
  const tempo = useProject((s) => s.tempo)
  const formations = useProject((s) => s.formations)
  const playing = useTransport((s) => s.playing)
  const loading = useTransport((s) => s.loading)
  const metronome = useTransport((s) => s.metronome)
  const error = useTransport((s) => s.error)
  const markMessage = useTransport((s) => s.markMessage)
  const mark = useTransport((s) => s.mark)
  const toggle = useTransport((s) => s.toggle)
  const seek = useTransport((s) => s.seek)
  const setMetronome = useTransport((s) => s.setMetronome)
  const dismissError = useTransport((s) => s.dismissError)

  // Re-renders once per count (a couple of times a second), not every frame: the timeline and stage draw the smooth motion.
  const count = useSyncExternalStore(playheadClock.subscribe, () => Math.floor(playheadClock.get()))
  const bounds = useMemo(() => timelineBounds(formations, song, tempo), [formations, song, tempo])
  const position = Math.min(Math.max(count, bounds.minCount), bounds.maxCount)

  return (
    <div className={cn(!compact && 'rounded-lg border border-border bg-surface p-2')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          variant="primary"
          className="w-28"
          onClick={() => void toggle()}
          disabled={!song || loading}
          title={!song ? NO_SONG_HINT : undefined}
        >
          <Icon name={playing ? 'pause' : 'play'} />
          {playing ? 'Pause' : 'Play'}
        </Button>
        <Button onClick={mark} disabled={!playing} title={MARK_TITLE}>
          <Icon name="flag" />
          Mark
        </Button>
        {/* Spoken through the slider's value text, so hidden from screen readers here to avoid saying it twice. */}
        <span aria-hidden className="w-28 text-sm tabular-nums">
          {readout(count)}
        </span>
        <div className="min-w-40 flex-1">
          <Slider
            label="Playback position"
            valueText={readout(count)}
            min={bounds.minCount}
            max={bounds.maxCount}
            value={position}
            onChange={seek}
          />
        </div>
        <Checkbox checked={metronome} onChange={(e) => setMetronome(e.target.checked)}>
          Click on every count
        </Checkbox>
      </div>

      {/* What each tap did is announced to screen readers; sighted people see the formation move on the stage and timeline. */}
      <p role="status" className="sr-only">
        {markMessage}
      </p>
      {!compact && (
        <p className="min-h-4 px-1 pt-1 text-xs text-muted-foreground">{markMessage ?? (song ? MARK_HINT : NO_SONG_HINT)}</p>
      )}

      {error && (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-danger-soft p-2 text-sm text-danger">
          <p className="min-w-0 flex-1 basis-56">{error}</p>
          <Button variant="ghost" onClick={dismissError}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  )
}
