// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { Checkbox } from './Checkbox'
import { Icon } from './Icon'
import { IconButton } from './IconButton'
import { Input } from './Input'
import { Select } from './Select'
import { fieldClass } from './field'

describe('Icon', () => {
  it('is decorative: hidden from assistive tech, not focusable', () => {
    const { container } = render(<Icon name="close" />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
  })

  it('draws every icon, and takes size and colour from the caller', () => {
    for (const name of ['close', 'chevronLeft', 'chevronRight', 'chevronUp', 'chevronDown', 'sun', 'moon', 'undo', 'redo', 'plus', 'minus', 'play', 'pause', 'flag', 'download'] as const) {
      const { container, unmount } = render(<Icon name={name} className="size-6 text-danger" />)
      expect(container.querySelectorAll('path').length).toBeGreaterThan(0)
      expect(container.querySelector('svg')).toHaveClass('size-6', 'text-danger')
      unmount()
    }
  })
})

describe('IconButton', () => {
  it('is named by its label (and shows it as a tooltip)', () => {
    render(<IconButton icon="close" label="Remove Maya" />)
    const button = screen.getByRole('button', { name: 'Remove Maya' })
    expect(button).toHaveAttribute('title', 'Remove Maya')
  })

  it('lets a more specific tooltip replace the title without changing the name', () => {
    render(<IconButton icon="close" label="Remove Maya" title="Remove dancer" />)
    const button = screen.getByRole('button', { name: 'Remove Maya' })
    expect(button).toHaveAttribute('title', 'Remove dancer')
  })

  it('clicks, and cannot be clicked when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { rerender } = render(<IconButton icon="chevronLeft" label="Back" onClick={onClick} />)
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(<IconButton icon="chevronLeft" label="Back" onClick={onClick} disabled />)
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('Checkbox', () => {
  it('is named by its label and toggling the label toggles the box', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Checkbox checked={false} onChange={onChange}>
        All sections
      </Checkbox>,
    )
    await user.click(screen.getByText('All sections'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('checkbox', { name: 'All sections' })).not.toBeChecked()
  })

  it('reflects checked and disabled', () => {
    render(
      <Checkbox checked onChange={() => {}} disabled>
        Verse
      </Checkbox>,
    )
    const box = screen.getByRole('checkbox', { name: 'Verse' })
    expect(box).toBeChecked()
    expect(box).toBeDisabled()
  })
})

describe('shared field look', () => {
  it('Input and Select use the same field style', () => {
    render(
      <>
        <Input aria-label="text" />
        <Select aria-label="choice" />
      </>,
    )
    for (const cls of fieldClass.split(' ').filter((c) => !c.startsWith('focus:') && !c.startsWith('disabled:'))) {
      expect(screen.getByLabelText('text')).toHaveClass(cls)
      expect(screen.getByLabelText('choice')).toHaveClass(cls)
    }
  })

  it('Input has an inline variant for names edited in place, and callers can still adjust it', () => {
    render(<Input aria-label="name" variant="inline" className="max-w-56" />)
    const input = screen.getByLabelText('name')
    expect(input).toHaveClass('border-transparent', 'max-w-56')
    expect(input).not.toHaveClass('border-border-strong')
  })
})

describe('Button chip variant', () => {
  it('is styled by aria-pressed so what looks selected is what is announced', () => {
    render(
      <>
        <Button variant="chip" aria-pressed>
          Selected
        </Button>
        <Button variant="chip" aria-pressed={false}>
          Other
        </Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Selected' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Selected' })).toHaveClass('aria-pressed:border-primary')
    expect(screen.getByRole('button', { name: 'Other' })).toHaveAttribute('aria-pressed', 'false')
  })
})
