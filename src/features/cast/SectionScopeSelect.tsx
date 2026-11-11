import { Checkbox } from '../../components/ui/Checkbox'
import { fieldClass } from '../../components/ui/field'
import { Icon } from '../../components/ui/Icon'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/Popover'
import { cn } from '../../lib/cn'
import { sectionScopeLabel, toggleSectionInScope } from '../../model/parts'
import type { Id, Section } from '../../model/types'

interface Props {
  /** Accessible name, e.g. "Sections of part 2". */
  label: string
  sections: Section[]
  /** The sections the part applies to, or null for all sections. */
  value: Id[] | null
  onChange: (value: Id[] | null) => void
}

/**
 * A dropdown for choosing which sections a part applies to: "All sections", or
 * any combination of sections (they needn't be next to each other).
 */
export function SectionScopeSelect({ label, sections, value, onChange }: Props) {
  const summary = sectionScopeLabel(value, sections)
  return (
    <Popover>
      <PopoverTrigger
        // The name starts with what the button is for and ends with the text it shows, so a voice-control user can say what they see.
        aria-label={`${label}: ${summary}`}
        className={cn(
          fieldClass,
          'inline-flex w-44 items-center justify-between gap-2 px-2 py-2 text-left',
          value !== null && value.length === 0 && 'border-danger text-danger',
        )}
      >
        <span className="truncate">{summary}</span>
        <Icon name="chevronDown" className="text-subtle-foreground" />
      </PopoverTrigger>
      <PopoverContent aria-label={label}>
        <Checkbox checked={value === null} onChange={() => onChange(null)}>
          All sections
        </Checkbox>
        <div className="my-1 border-t border-border" />
        <div className="max-h-64 overflow-y-auto">
          {sections.map((section) => (
            <Checkbox
              key={section.id}
              checked={value !== null && value.includes(section.id)}
              onChange={() => onChange(toggleSectionInScope(value, section.id))}
            >
              <span className="min-w-0 truncate">{section.name}</span>
            </Checkbox>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
