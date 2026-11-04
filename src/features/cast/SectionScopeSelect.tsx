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

const row = 'flex min-h-10 cursor-pointer items-center gap-2 rounded px-2 hover:bg-surface-hover'

/**
 * A dropdown for choosing which sections a part applies to: "All sections", or
 * any combination of sections (they needn't be next to each other).
 */
export function SectionScopeSelect({ label, sections, value, onChange }: Props) {
  const summary = sectionScopeLabel(value, sections)
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        className={cn(
          'inline-flex min-h-10 w-44 items-center justify-between gap-2 rounded-md border border-border-strong bg-surface px-2 py-2 text-left text-sm text-foreground focus:border-ring focus:outline-none',
          value !== null && value.length === 0 && 'border-danger text-danger',
        )}
      >
        <span className="truncate">{summary}</span>
        <span aria-hidden className="text-subtle-foreground">
          ▾
        </span>
      </PopoverTrigger>
      <PopoverContent aria-label={label}>
        <label className={row}>
          <input type="checkbox" checked={value === null} onChange={() => onChange(null)} className="h-4 w-4" />
          All sections
        </label>
        <div className="my-1 border-t border-border" />
        <div className="max-h-64 overflow-y-auto">
          {sections.map((section) => (
            <label key={section.id} className={row}>
              <input
                type="checkbox"
                checked={value !== null && value.includes(section.id)}
                onChange={() => onChange(toggleSectionInScope(value, section.id))}
                className="h-4 w-4"
              />
              <span className="min-w-0 truncate">{section.name}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
