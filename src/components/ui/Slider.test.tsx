// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Slider } from './Slider'

describe('Slider', () => {
  it('is a slider with its name, range and value', () => {
    render(<Slider label="Playback position" value={5} min={-8} max={64} onChange={() => {}} />)
    const slider = screen.getByRole('slider', { name: 'Playback position' })
    expect(slider).toHaveValue('5')
    expect(slider).toHaveAttribute('min', '-8')
    expect(slider).toHaveAttribute('max', '64')
    expect(slider).toHaveAttribute('step', '1')
  })

  it('tells you the new value, as a number, when it moves', () => {
    const onChange = vi.fn()
    render(<Slider label="Position" value={5} min={0} max={64} onChange={onChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '12' } })
    expect(onChange).toHaveBeenCalledExactlyOnceWith(12)
  })

  it('can describe its value in words for screen readers', () => {
    render(<Slider label="Position" value={10} min={0} max={64} valueText="Set 2, Count 3" onChange={() => {}} />)
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'Set 2, Count 3')
  })

  it('can be disabled, take a custom step, and take extra classes', () => {
    render(<Slider label="Position" value={1} min={0} max={2} step={0.5} disabled className="max-w-xs" onChange={() => {}} />)
    const slider = screen.getByRole('slider')
    expect(slider).toBeDisabled()
    expect(slider).toHaveAttribute('step', '0.5')
    expect(slider).toHaveClass('max-w-xs')
  })

  it('is tall enough to touch', () => {
    render(<Slider label="Position" value={1} min={0} max={2} onChange={() => {}} />)
    expect(screen.getByRole('slider')).toHaveClass('h-10')
  })
})
