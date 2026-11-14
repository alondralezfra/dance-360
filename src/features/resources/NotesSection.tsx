import { SectionHeader } from '../../components/ui/SectionHeader'
import { groupNotes } from '../../model/notes'
import { useProject } from '../../store/projectStore'
import { AddNoteForm } from './AddNoteForm'
import { NoteRow } from './NoteRow'

/** The project's notes, organised by the section they are about. */
export function NotesSection() {
  const notes = useProject((s) => s.notes)
  const sections = useProject((s) => s.sections)
  const parts = useProject((s) => s.parts)
  const groups = groupNotes(notes, sections)

  return (
    <section aria-labelledby="notes-heading">
      <SectionHeader id="notes-heading" title="Notes">
        Reminders about the choreography, each about the whole dance, a section or one count (say "5-6" in the text
        for a stretch), and optionally one part.
      </SectionHeader>

      <AddNoteForm />

      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
          No notes yet. Write one above.
        </p>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <div key={group.section?.id ?? 'whole'}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.section ? group.section.name : 'Whole dance'}
              </h3>
              <ul className="grid grid-cols-1 gap-2">
                {group.items.map((note) => (
                  <NoteRow key={note.id} note={note} number={notes.indexOf(note) + 1} sections={sections} parts={parts} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
