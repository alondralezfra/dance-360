import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { fieldClass } from './field'

const inputVariants = cva('', {
  variants: {
    variant: {
      default: `${fieldClass} px-3 py-2 placeholder:text-subtle-foreground`,
      // Reads as plain text until hovered or focused: for names edited in place.
      inline:
        'min-h-10 rounded-md border border-transparent bg-transparent px-2 py-2 text-sm text-foreground hover:border-border focus:border-ring focus:bg-surface focus:outline-none disabled:opacity-40',
    },
  },
  defaultVariants: { variant: 'default' },
})

export type InputProps = ComponentProps<'input'> & VariantProps<typeof inputVariants>

export function Input({ className, variant, ...props }: InputProps) {
  return <input className={cn(inputVariants({ variant }), className)} {...props} />
}
