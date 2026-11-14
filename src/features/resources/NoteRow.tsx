import { IconButton } from '../../components/ui/IconButton'
import { Textarea } from '../../components/ui/Textarea'
import { MAX_NOTE_LENGTH } from '../../model/notes'
import type { Note, Part, Section } from '../../model/types'
import { useProject } from '../../store/projectStore'
import { AnchorFields } from './AnchorFields'
import { PartSelect } from './PartSelect'

interface NoteRowProps {
  note: Note
  /** Its place in the whole list, from 1: part of every control's name, so each can be told apart. */
  number: number
  sections: Section[]
  parts: Part[]
}

/** One note: its text, what it is about, and which part, all edited in place. */
export function NoteRow({ note, number, sections, parts }: NoteRowProps) {
  const updateNote = useProject((s) => s.updateNote)
  const removeNote = useProject((s) => s.removeNote)

  return (
    <li className="grid gap-2 rounded-lg border border-border bg-surface p-2">
      <Textarea
        value={note.text}
        onChange={(e) => updateNote(note.id, { text: e.target.value })}
        aria-label={`Text of note ${number}`}
        maxLength={MAX_NOTE_LENGTH}
        rows={2}
      />
      <div className="flex flex-wrap items-center gap-2">
        <AnchorFields anchor={note.anchor} onChange={(anchor) => updateNote(note.id, { anchor })} sections={sections} label={`note ${number}`} />
        <PartSelect parts={parts} value={note.partId} onChange={(partId) => updateNote(note.id, { partId })} label={`Part of note ${number}`} />
        <IconButton
          variant="danger-ghost"
          icon="close"
          className="ml-auto"
          label={`Remove note ${number}`}
          title="Remove note"
          onClick={() => removeNote(note.id)}
        />
      </div>
    </li>
  )
}
