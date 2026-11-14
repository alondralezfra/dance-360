import { useState, type ComponentProps } from 'react'
import { Input } from '../../components/ui/Input'

interface CommittedInputProps extends Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'onBlur' | 'onKeyDown'> {
  /** What is saved now, as text. */
  value: string
  /** Turns what was typed into the text to save (tidied up), or null if it is not acceptable. */
  parse: (typed: string) => string | null
  onCommit: (saved: string) => void
}

/**
 * A text field for something that has to be valid before it is saved (a web address, a start time). You can
 * clear and retype freely; when you leave the field or press Enter the text is checked: a good entry is saved
 * (in its tidied-up form), a bad one puts back what was there.
 */
export function CommittedInput({ value, parse, onCommit, ...props }: CommittedInputProps) {
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    const typed = draft
    setDraft(null)
    if (typed === null) return
    const parsed = parse(typed)
    if (parsed !== null && parsed !== value) onCommit(parsed)
  }

  return (
    <Input
      {...props}
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )
}
