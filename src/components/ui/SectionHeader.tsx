import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface SectionHeaderProps {
  /** The heading's id; give the section `aria-labelledby` the same id so it is named for screen readers. */
  id: string
  title: string
  /** A line of explanation under the title. */
  children?: ReactNode
  /** Buttons for the section, shown on the right (wrapping below on narrow screens). */
  actions?: ReactNode
  className?: string
}

/** The title of a screen section, with an optional explanation and action buttons. */
export function SectionHeader({ id, title, children, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-3 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0 flex-1 basis-56">
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        {children && <p className="text-sm text-muted-foreground">{children}</p>}
      </div>
      {actions}
    </div>
  )
}
