// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../../model/project'
import { startHistory } from '../../store/history'
import { useProject } from '../../store/projectStore'
import { UndoRedoButtons } from './UndoRedoButtons'
import { useUndoShortcuts } from './useUndoShortcuts'

let stop: () => void
beforeEach(() => {
  useProject.setState({ projectId: null, status: 'idle' })
  stop = startHistory()
  useProject.setState({ ...createEmptyProject(), projectId: 'p', status: 'ready' })
})
afterEach(() => stop())

const dancers = () => useProject.getState().dancers.map((d) => d.name)

function Harness() {
  useUndoShortcuts()
  return (
    <>
      <UndoRedoButtons />
      <input aria-label="A text box" />
      <input type="checkbox" aria-label="A checkbox" />
    </>
  )
}

describe('Undo / Redo buttons', () => {
  it('are disabled until there is something to undo or redo', async () => {
    const user = userEvent.setup()
    render(<UndoRedoButtons />)
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()

    useProject.getState().addDancer('Maya')
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(dancers()).toEqual([])
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Redo' }))
    expect(dancers()).toEqual(['Maya'])
  })
})

describe('undo shortcuts', () => {
  const press = (init: KeyboardEventInit, target: Element | Window = window) =>
    fireEvent.keyDown(target, init)

  it('Ctrl+Z undoes, Ctrl+Shift+Z and Ctrl+Y redo, and Cmd works too', () => {
    render(<Harness />)
    useProject.getState().addDancer('Maya')
    press({ key: 'z', ctrlKey: true })
    expect(dancers()).toEqual([])
    press({ key: 'Z', ctrlKey: true, shiftKey: true })
    expect(dancers()).toEqual(['Maya'])
    press({ key: 'z', metaKey: true })
    expect(dancers()).toEqual([])
    press({ key: 'y', ctrlKey: true })
    expect(dancers()).toEqual(['Maya'])
  })

  it('stops the browser acting on a shortcut it used, but leaves other keys alone', () => {
    render(<Harness />)
    expect(fireEvent.keyDown(window, { key: 'z', ctrlKey: true })).toBe(false) // default prevented
    expect(fireEvent.keyDown(window, { key: 'z' })).toBe(true)
    expect(fireEvent.keyDown(window, { key: 'x', ctrlKey: true })).toBe(true)
    expect(fireEvent.keyDown(window, { key: 'z', ctrlKey: true, altKey: true })).toBe(true)
  })

  it('does nothing while typing in a text box (the browser undoes the text instead)', () => {
    render(<Harness />)
    useProject.getState().addDancer('Maya')
    press({ key: 'z', ctrlKey: true }, screen.getByLabelText('A text box'))
    expect(dancers()).toEqual(['Maya'])
  })

  it('still works when a checkbox has focus', () => {
    render(<Harness />)
    useProject.getState().addDancer('Maya')
    press({ key: 'z', ctrlKey: true }, screen.getByLabelText('A checkbox'))
    expect(dancers()).toEqual([])
  })

  it('does nothing when there is nothing to undo, and stops listening after unmount', () => {
    const { unmount } = render(<Harness />)
    press({ key: 'z', ctrlKey: true })
    expect(dancers()).toEqual([])

    useProject.getState().addDancer('Maya')
    unmount()
    press({ key: 'z', ctrlKey: true })
    expect(dancers()).toEqual(['Maya'])
  })
})
