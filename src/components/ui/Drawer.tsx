import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}

/**
 * A panel that slides over the screen from the left. Radix handles focus
 * trapping, Escape to close, and screen-reader labelling.
 */
export function Drawer({ open, onOpenChange, title, children }: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-30 w-72 max-w-[85%] bg-surface text-foreground shadow-xl focus:outline-none"
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
