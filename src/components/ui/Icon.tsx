import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

/**
 * The app's icons: one source, so they look the same on every device (text
 * symbols like ✕ or ◀ change with the font) and take the surrounding text colour.
 * Add an icon by adding its path(s) here (24x24 grid, drawn as outlines).
 */
const paths = {
  close: ['M18 6 6 18', 'm6 6 12 12'],
  chevronLeft: ['m15 18-6-6 6-6'],
  chevronRight: ['m9 18 6-6-6-6'],
  chevronUp: ['m18 15-6-6-6 6'],
  chevronDown: ['m6 9 6 6 6-6'],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
    'M12 2v2',
    'M12 20v2',
    'm4.9 4.9 1.4 1.4',
    'm17.7 17.7 1.4 1.4',
    'M2 12h2',
    'M20 12h2',
    'm6.3 17.7-1.4 1.4',
    'm19.1 4.9-1.4 1.4',
  ],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
  play: ['M6 4.5v15l13-7.5z'],
  pause: ['M8 5v14', 'M16 5v14'],
  download: ['M12 3v12', 'm7 10 5 5 5-5', 'M4 21h16'],
  flag: ['M4 22V4', 'M4 4h13l-3 4.5 3 4.5H4'],
  externalLink: ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  undo: ['M3 7v6h6', 'M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13'],
  redo: ['M21 7v6h-6', 'M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13'],
} as const

export type IconName = keyof typeof paths

interface IconProps extends Omit<ComponentProps<'svg'>, 'name'> {
  name: IconName
}

/** Decorative by default (the button or text next to it carries the meaning). */
export function Icon({ name, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      className={cn('size-4 shrink-0', className)}
      {...props}
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
