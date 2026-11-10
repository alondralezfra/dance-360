import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

interface SliderProps extends Omit<ComponentProps<'input'>, 'type' | 'value' | 'min' | 'max' | 'step' | 'onChange' | 'aria-label'> {
  /** What it controls. Required: a slider alone has no accessible name. */
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** The value in words for screen readers, e.g. "Set 3, Count 5", when the bare number means little. */
  valueText?: string
}

/** A draggable slider (a playback position, a volume...): touch-sized, keyboard friendly (arrow keys, Home, End). */
export function Slider({ label, value, min, max, step = 1, onChange, valueText, className, ...props }: SliderProps) {
  return (
    <input
      type="range"
      aria-label={label}
      aria-valuetext={valueText}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn('h-10 w-full cursor-pointer accent-primary disabled:cursor-default disabled:opacity-40', className)}
      {...props}
    />
  )
}
