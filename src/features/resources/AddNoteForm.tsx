import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Textarea'
import { DANCE_ANCHOR, MAX_NOTE_LENGTH } from '../../model/notes'
import type { Id, NoteAnchor } from '../../model/types'
import { useProject } from '../../store/projectStore'
import { AnchorFields } from './AnchorFields'
import { PartSelect } from './PartSelect'

/** Write a note, say what it is about (and which part), and add it. Ctrl or Cmd + Enter adds it from the text box. */
export function AddNoteForm() {
  const addNote = useProject((s) => s.addNote)
  const sections = useProject((s) => s.sections)
  const parts = useProject((s) => s.parts)
  const [text, setText] = useState('')
  const [anchor, setAnchor] = useState<NoteAnchor>(DANCE_ANCHOR)
  const [partId, setPartId] = useState<Id | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (addNote({ text, anchor, partId }) === null) {
      setProblem('Write the note first.')
      return
    }
    // The text is cleared; what the next note is about is kept, since notes tend to come in runs about one place.
    setText('')
    setProblem(null)
  }

  return (
    <form onSubmit={submit} className="mb-3 grid gap-2" noValidate>
      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setProblem(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit()
        }}
        aria-label="Text of the new note"
        aria-invalid={problem ? true : undefined}
        placeholder="A note for the dance, for example: arms up on 5-6"
        maxLength={MAX_NOTE_LENGTH}
        rows={2}
      />
      <div className="flex flex-wrap items-center gap-2">
        <AnchorFields anchor={anchor} onChange={setAnchor} sections={sections} label="the new note" />
        <PartSelect parts={parts} value={partId} onChange={setPartId} label="Part of the new note" />
        <Button type="submit" variant="primary" className="ml-auto">
          + Add note
        </Button>
      </div>
      {problem && (
        <p role="alert" className="text-sm text-danger">
          {problem}
        </p>
      )}
    </form>
  )
}
