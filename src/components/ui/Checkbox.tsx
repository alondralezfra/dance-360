import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type' | 'children'> {
  /** The visible label. Clicking it toggles the box, and it is the box's accessible name. */
  children: ReactNode
}

/** A checkbox with its label, as one touch-friendly row. */
export function Checkbox({ children, className, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        'flex min-h-10 cursor-pointer items-center gap-2 rounded px-2 text-sm hover:bg-surface-hover',
        className,
      )}
    >
      <input type="checkbox" className="size-4 shrink-0 accent-primary" {...props} />
      {children}
    </label>
  )
}
