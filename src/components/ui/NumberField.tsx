import { useId, useState } from 'react'
import { cn } from '../../lib/cn'
import { Input } from './Input'

interface NumberFieldProps {
  label: string
  /** The accessible name when the visible label alone would be ambiguous on the page ("Set of note 2"); it should contain the label. */
  name?: string
  value: number
  onCommit: (value: number) => void
  min?: number
  max?: number
  /** How many decimal places are kept (default 0: whole numbers). A tempo like 127.5 needs 1. */
  decimals?: number
  className?: string
}

/**
 * A labelled number input (whole numbers unless `decimals` says otherwise). You can
 * clear and retype freely; the value is validated and applied when you leave the
 * field or press Enter.
 */
export function NumberField({ label, name, value, onCommit, min, max, decimals = 0, className }: NumberFieldProps) {
  const id = useId()
  // While you're typing, `draft` holds your text; otherwise the field shows `value`.
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? String(value)

  const commit = () => {
    setDraft(null)
    const places = 10 ** decimals
    const n = Math.round(Number(text) * places) / places
    if (text.trim() === '' || !Number.isFinite(n)) return
    const clamped = Math.min(Math.max(n, min ?? -Infinity), max ?? Infinity)
    if (clamped !== value) onCommit(clamped)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </label>
      <Input
        id={id}
        aria-label={name}
        inputMode={decimals > 0 ? 'decimal' : 'numeric'}
        value={text}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className={cn('text-center', decimals > 0 ? 'w-24' : 'w-16')}
      />
    </div>
  )
}
