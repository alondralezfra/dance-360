import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { fieldClass } from './field'

/** A native dropdown: accessible, keyboard friendly, and comfortable on touch screens. */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(fieldClass, 'px-2 py-2', className)} {...props} />
}
