import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'min-h-10 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:border-ring focus:outline-none disabled:opacity-40',
        className,
      )}
      {...props}
    />
  )
}
