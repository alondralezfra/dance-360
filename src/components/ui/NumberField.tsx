import { useId, useState } from 'react'
import { cn } from '../../lib/cn'
import { Input } from './Input'

interface NumberFieldProps {
  label: string
  value: number
  onCommit: (value: number) => void
  min?: number
  max?: number
  className?: string
}

/**
 * A labelled whole-number input. You can clear and retype freely; the value is
 * validated and applied when you leave the field or press Enter.
 */
export function NumberField({ label, value, onCommit, min, max, className }: NumberFieldProps) {
  const id = useId()
  // While you're typing, `draft` holds your text; otherwise the field shows `value`.
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? String(value)

  const commit = () => {
    setDraft(null)
    const n = Math.round(Number(text))
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
        inputMode="numeric"
        value={text}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="w-16 text-center"
      />
    </div>
  )
}
