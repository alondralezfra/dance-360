import { Select } from '../../components/ui/Select'
import type { Id, Part } from '../../model/types'

interface PartSelectProps {
  parts: Part[]
  /** The chosen part, or null for any part. */
  value: Id | null
  onChange: (partId: Id | null) => void
  /** The accessible name ("Part of link 2"). */
  label: string
  className?: string
}

/** Which part a link or note is about: any part, or one of the project's parts. */
export function PartSelect({ parts, value, onChange, label, className }: PartSelectProps) {
  return (
    <Select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} aria-label={label} className={className}>
      <option value="">Any part</option>
      {parts.map((part) => (
        <option key={part.id} value={part.id}>
          {part.name}
        </option>
      ))}
    </Select>
  )
}
