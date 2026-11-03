import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

/** A native dropdown: accessible, keyboard friendly, and comfortable on touch screens. */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'min-h-10 rounded-md border border-border-strong bg-surface px-2 py-2 text-sm text-foreground focus:border-ring focus:outline-none disabled:opacity-40',
        className,
      )}
      {...props}
    />
  )
}
