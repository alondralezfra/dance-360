import { NumberField } from '../../components/ui/NumberField'
import { Select } from '../../components/ui/Select'
import { cn } from '../../lib/cn'
import { COUNTS_PER_SET, fromSetAndCount, toSetAndCount } from '../../model/tempo'
import type { NoteAnchor, Section } from '../../model/types'

interface AnchorFieldsProps {
  anchor: NoteAnchor
  onChange: (anchor: NoteAnchor) => void
  sections: Section[]
  /** What the controls are for, in their accessible names ("note 2", "the new note"). */
  label: string
  className?: string
}

/** What a note is about: the whole dance, one section, or one count (shown as Set and Count). */
export function AnchorFields({ anchor, onChange, sections, label, className }: AnchorFieldsProps) {
  const value = anchor.kind === 'section' ? `section:${anchor.sectionId}` : anchor.kind
  const at = anchor.kind === 'count' ? toSetAndCount(anchor.count) : null

  const choose = (choice: string) => {
    if (choice === 'dance') onChange({ kind: 'dance' })
    else if (choice === 'count') onChange({ kind: 'count', count: anchor.kind === 'count' ? anchor.count : 0 })
    else onChange({ kind: 'section', sectionId: choice.replace('section:', '') })
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Select value={value} onChange={(e) => choose(e.target.value)} aria-label={`About ${label}`}>
        <option value="dance">Whole dance</option>
        {sections.map((section) => (
          <option key={section.id} value={`section:${section.id}`}>
            {section.name}
          </option>
        ))}
        <option value="count">A count</option>
      </Select>
      {at && (
        <>
          <NumberField
            label="Set"
            name={`Set of ${label}`}
            min={1}
            value={at.set}
            onCommit={(set) => onChange({ kind: 'count', count: fromSetAndCount(set, at.count) })}
          />
          <NumberField
            label="Count"
            name={`Count of ${label}`}
            min={1}
            max={COUNTS_PER_SET}
            value={at.count}
            onCommit={(count) => onChange({ kind: 'count', count: fromSetAndCount(at.set, count) })}
          />
        </>
      )}
    </div>
  )
}
