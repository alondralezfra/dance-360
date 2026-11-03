import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

const buttonVariants = cva(
  // min-h keeps every button a comfortable touch target
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary:
          'border border-border-strong bg-surface text-foreground hover:bg-surface-hover',
        ghost: 'text-foreground hover:bg-surface-hover',
        danger:
          'border border-border-strong bg-surface text-foreground hover:border-danger hover:text-danger',
        'danger-ghost':
          'text-subtle-foreground hover:bg-danger-soft hover:text-danger',
      },
      size: {
        md: 'px-3 py-2',
        icon: 'min-w-10 px-2',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
