import { useEffect, useId, useRef, useSyncExternalStore } from 'react'
import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { formatCount } from '../../model/tempo'
import { notesAtCount } from '../../model/notes'
import type { Note, Part } from '../../model/types'
import { useProject } from '../../store/projectStore'
import { playheadClock } from '../../store/transport'
import { PartSwatch } from '../../components/PartSwatch'

function NoteItem({ note, parts, now }: { note: Note; parts: Part[]; now: boolean }) {
  const part = parts.find((p) => p.id === note.partId)
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    // (scrollIntoView is missing from the test environment's DOM)
    if (now) ref.current?.scrollIntoView?.({ block: 'nearest' })
  }, [now])
  return (
    <li
      ref={ref}
      aria-current={now ? 'true' : undefined}
      className={cn('rounded-lg border p-2 text-sm', now ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border bg-background')}
    >
      {note.anchor.kind === 'count' && <p className="text-xs font-medium text-muted-foreground">{formatCount(note.anchor.count)}</p>}
      <p className="whitespace-pre-wrap break-words">{note.text}</p>
      {part && (
        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <PartSwatch color={part.color} className="h-3 w-3" />
          {part.name}
        </p>
      )}
    </li>
  )
}

/**
 * The notes that matter where the playhead is: those about this section (the one just reached is highlighted and stays so
 * until the next note's count) and those about the whole dance. Read-only; notes are written on the Resources tab.
 */
export function NotesPanel() {
  // (the side panel and the phone drawer are separate copies, so the heading's id must be unique)
  const headingId = useId()
  const notes = useProject((s) => s.notes)
  const sections = useProject((s) => s.sections)
  const parts = useProject((s) => s.parts)
  // Re-renders once per count (not per frame), and only this small panel.
  const count = useSyncExternalStore(playheadClock.subscribe, () => Math.floor(playheadClock.get()))
  const { section, whole, inSection, activeCount } = notesAtCount(notes, sections, count)

  return (
    <section aria-labelledby={headingId} className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <h2 id={headingId} className="text-sm font-semibold">
        Notes
      </h2>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section?.name ?? 'This section'}</h3>
            {inSection.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes for this section.</p>
            ) : (
              <ul className="grid gap-2">
                {inSection.map((n) => (
                  <NoteItem key={n.id} note={n} parts={parts} now={n.anchor.kind === 'count' && n.anchor.count === activeCount} />
                ))}
              </ul>
            )}
          </div>
          {whole.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Whole dance</h3>
              <ul className="grid gap-2">
                {whole.map((n) => (
                  <NoteItem key={n.id} note={n} parts={parts} now={false} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <Link to="../resources" className="mt-auto inline-flex min-h-11 items-center text-sm text-link underline">
        Edit notes on the Resources tab
      </Link>
    </section>
  )
}
