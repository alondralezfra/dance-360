import { cn } from '../../lib/cn'
import type { PartColorId } from '../../model/types'

/** A small circle in a part's colour (dashed and empty when there is no part). */
export function PartSwatch({ color, className }: { color?: PartColorId; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-4 w-4 shrink-0 rounded-full border',
        color ? 'border-border-strong' : 'border-dashed border-subtle-foreground',
        className,
      )}
      style={color ? { backgroundColor: `var(--part-${color})` } : undefined}
    />
  )
}
