import { useEffect } from 'react'
import { Button } from '../../components/ui/Button'
import { NumberField } from '../../components/ui/NumberField'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { MAX_SPEAKER_DELAY_MS } from '../../model/calibration'
import { useCalibration } from '../../store/calibrationStore'
import { useSpeaker } from '../../store/speakerStore'

/**
 * How late this device's speaker sounds (Bluetooth is 150 to 300 ms), so the dancers on screen
 * line up with the sound and a tap lands on the beat you heard. Type it, or tap along to a few
 * clicks and let the app measure it. Kept on this device, not in the project.
 */
export function SpeakerDelaySection() {
  const delayMs = useSpeaker((s) => s.delayMs)
  const setDelayMs = useSpeaker((s) => s.setDelayMs)
  const { status, taps, result, error, start, tap, apply, cancel } = useCalibration()

  // Leaving the page ends a measurement in progress.
  useEffect(() => () => useCalibration.getState().cancel(), [])

  const measuring = status === 'starting' || status === 'listening'

  return (
    <section aria-labelledby="speaker-delay-heading">
      <SectionHeader
        id="speaker-delay-heading"
        title="Speaker delay"
        actions={
          status === 'idle' ? <Button onClick={() => void start()}>Calibrate by tapping</Button> : undefined
        }
      >
        Bluetooth speakers play sound a moment late. Set how late yours is, so the dancers line up with what you hear and
        a tap lands on the beat you heard. This is kept on this device, not in the project.
      </SectionHeader>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <NumberField label="Delay (ms)" value={delayMs} min={0} max={MAX_SPEAKER_DELAY_MS} onCommit={setDelayMs} />
        <p className="text-sm text-muted-foreground">{delayMs === 0 ? 'No delay: wired speakers and headphones are usually close to this.' : `The sound is ${delayMs} ms late.`}</p>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-danger-soft p-2 text-sm text-danger">
          {error}
        </p>
      )}

      {measuring && (
        <div className="mt-3 grid gap-3 rounded-lg border border-border bg-surface p-3">
          <p className="text-sm">
            {status === 'starting'
              ? 'Starting the clicks…'
              : 'Listen to the clicks and tap the big button on every one, as it sounds. About twelve clicks.'}
          </p>
          <Button
            variant="primary"
            className="min-h-16 text-lg"
            disabled={status !== 'listening'}
            // On pressing down, not on release, so the tap is noted at the moment it is made. (A key press has no pointer: its click does it.)
            onPointerDown={tap}
            onClick={(e) => e.detail === 0 && tap()}
          >
            Tap on each click
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {taps} {taps === 1 ? 'tap' : 'taps'} so far
            </p>
            <Button variant="ghost" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className="mt-3 grid gap-3 rounded-lg border border-border bg-surface p-3">
          {result === null ? (
            <p role="status" className="text-sm">
              Not enough of your taps lined up with the clicks. Try again, tapping once on each click you hear.
            </p>
          ) : (
            <p role="status" className="text-sm">
              Your sound is about <strong>{result} ms</strong> late.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {result !== null && (
              <Button variant="primary" onClick={apply}>
                Use {result} ms
              </Button>
            )}
            <Button onClick={() => void start()}>Try again</Button>
            <Button variant="ghost" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
