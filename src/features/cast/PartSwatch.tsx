import { cn } from '../../lib/cn'
import type { PartColorId } from '../../model/types'

interface Props {
  color?: PartColorId
  /** A solid neutral circle, the same gray as a dot with no part (used for "everyone dances together"). */
  neutral?: boolean
  className?: string
}

/** A small circle in a part's colour (dashed and empty when there is no part). */
export function PartSwatch({ color, neutral, className }: Props) {
  const filled = color !== undefined || neutral
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-4 w-4 shrink-0 rounded-full border',
        filled ? 'border-border-strong' : 'border-dashed border-subtle-foreground',
        className,
      )}
      style={
        color
          ? { backgroundColor: `var(--part-${color})` }
          : neutral
            ? { backgroundColor: 'var(--dot-unassigned)' }
            : undefined
      }
    />
  )
}
