// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NumberField } from './NumberField'

const setup = (props: Partial<React.ComponentProps<typeof NumberField>> = {}) => {
  const onCommit = vi.fn()
  render(<NumberField label="Set" value={3} onCommit={onCommit} {...props} />)
  return { onCommit, input: screen.getByLabelText('Set') as HTMLInputElement, user: userEvent.setup() }
}

describe('NumberField', () => {
  it('shows the label and current value', () => {
    const { input } = setup()
    expect(input).toHaveValue('3')
  })

  it('commits a typed value on blur', async () => {
    const { input, onCommit, user } = setup()
    await user.clear(input)
    await user.type(input, '7')
    await user.tab()
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(7)
  })

  it('commits on Enter', async () => {
    const { input, onCommit, user } = setup()
    await user.clear(input)
    await user.type(input, '5{Enter}')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(5)
  })

  it('lets you clear the field while typing without committing', async () => {
    const { input, onCommit, user } = setup()
    await user.clear(input)
    expect(input).toHaveValue('')
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('reverts a blank field to the last valid value on blur', async () => {
    const { input, onCommit, user } = setup()
    await user.clear(input)
    await user.tab()
    expect(input).toHaveValue('3')
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('reverts non-numeric text', async () => {
    const { input, onCommit, user } = setup()
    await user.clear(input)
    await user.type(input, 'abc')
    await user.tab()
    expect(input).toHaveValue('3')
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('clamps to min and max', async () => {
    const { input, onCommit, user } = setup({ min: 1, max: 8 })
    await user.clear(input)
    await user.type(input, '99')
    await user.tab()
    expect(onCommit).toHaveBeenLastCalledWith(8)
    await user.clear(input)
    await user.type(input, '-4')
    await user.tab()
    expect(onCommit).toHaveBeenLastCalledWith(1)
  })

  it('rounds decimals', async () => {
    const { input, onCommit, user } = setup()
    await user.clear(input)
    await user.type(input, '4.6')
    await user.tab()
    expect(onCommit).toHaveBeenCalledWith(5)
  })

  it('does not commit when the value is unchanged', async () => {
    const { input, onCommit, user } = setup()
    await user.click(input)
    await user.tab()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('follows the value prop when it changes from outside', () => {
    const { rerender } = render(<NumberField label="Count" value={1} onCommit={() => {}} />)
    rerender(<NumberField label="Count" value={6} onCommit={() => {}} />)
    expect(screen.getByLabelText('Count')).toHaveValue('6')
  })
})
