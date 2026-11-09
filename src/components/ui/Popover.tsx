import * as RadixPopover from '@radix-ui/react-popover'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

export const Popover = RadixPopover.Root
export const PopoverTrigger = RadixPopover.Trigger

/**
 * A small floating panel anchored to its trigger. Radix handles focus,
 * Escape to close, click-outside and keeping it on screen.
 */
export function PopoverContent({ className, ...props }: ComponentProps<typeof RadixPopover.Content>) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        align="start"
        sideOffset={4}
        collisionPadding={8}
        className={cn(
          'z-40 w-64 max-w-[calc(100vw-1rem)] rounded-md border border-border bg-surface p-2 text-sm text-foreground shadow-lg focus:outline-none',
          className,
        )}
        {...props}
      />
    </RadixPopover.Portal>
  )
}
