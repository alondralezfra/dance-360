import { useEffect } from 'react'
import { useProject } from '../../store/projectStore'
import { useSong } from '../../store/songStore'
import { TransportBar } from '../transport/TransportBar'
import { SongSection } from './SongSection'
import { SpeakerDelaySection } from './SpeakerDelaySection'
import { TempoSection } from './TempoSection'
import { TimelinePanel } from './TimelinePanel'

/** The song tab: attach the music, set the tempo, and see the song against the counts. */
export function SongPage() {
  const projectId = useProject((s) => s.projectId)
  const songHash = useProject((s) => s.song?.hash)

  // Whenever the project or its song changes, check whether the file is on this device and load its waveform.
  useEffect(() => {
    void useSong.getState().refresh()
  }, [projectId, songHash])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {/* grid-cols-1 (minmax(0, 1fr)) stops a wide child from stretching the whole column */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 p-4">
        <SongSection />
        <TempoSection />
        <SpeakerDelaySection />
        <section aria-label="Playback" className="grid gap-3">
          <TransportBar />
          <TimelinePanel />
        </section>
      </div>
    </div>
  )
}
