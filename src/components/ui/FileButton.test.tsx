// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FileButton } from './FileButton'

const input = (container: HTMLElement) => container.querySelector('input[type="file"]') as HTMLInputElement

describe('FileButton', () => {
  it('is a button with its label, and passes the picker its accept filter', () => {
    const { container } = render(<FileButton accept="audio/*" onFile={() => {}}>Attach song</FileButton>)
    expect(screen.getByRole('button', { name: 'Attach song' })).toBeInTheDocument()
    expect(input(container)).toHaveAttribute('accept', 'audio/*')
  })

  it('opens the file picker when the button is pressed', async () => {
    const user = userEvent.setup()
    const { container } = render(<FileButton onFile={() => {}}>Attach song</FileButton>)
    const click = vi.spyOn(input(container), 'click')
    await user.click(screen.getByRole('button', { name: 'Attach song' }))
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('hands over the chosen file, and lets the same file be chosen again', async () => {
    const user = userEvent.setup()
    const onFile = vi.fn()
    const { container } = render(<FileButton onFile={onFile}>Attach song</FileButton>)
    const file = new File(['x'], 'track.mp3', { type: 'audio/mpeg' })
    await user.upload(input(container), file)
    expect(onFile).toHaveBeenCalledExactlyOnceWith(file)
    expect(input(container).value).toBe('') // reset so choosing it again still counts
    await user.upload(input(container), file)
    expect(onFile).toHaveBeenCalledTimes(2)
  })

  it('does nothing when no file is chosen', () => {
    const onFile = vi.fn()
    const { container } = render(<FileButton onFile={onFile}>Attach song</FileButton>)
    input(container).dispatchEvent(new Event('change', { bubbles: true }))
    expect(onFile).not.toHaveBeenCalled()
  })

  it('keeps the file input out of the tab order and away from screen readers', () => {
    const { container } = render(<FileButton onFile={() => {}}>Attach song</FileButton>)
    expect(input(container)).toHaveAttribute('tabindex', '-1')
    expect(input(container)).toHaveAttribute('aria-hidden', 'true')
  })

  it('can be disabled, and takes the usual button variants', () => {
    render(
      <FileButton variant="primary" disabled onFile={() => {}}>
        Attach song
      </FileButton>,
    )
    expect(screen.getByRole('button', { name: 'Attach song' })).toBeDisabled()
  })
})
