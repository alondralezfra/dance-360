import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { fieldClass } from './field'

/** A multi-line text box, for text longer than a line (a note). Looks like `Input`; drag its corner to make it taller. */
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldClass, 'min-h-20 resize-y px-3 py-2 placeholder:text-subtle-foreground', className)} {...props} />
}
