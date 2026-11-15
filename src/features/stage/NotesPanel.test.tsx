// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../../model/project'
import { useProject } from '../../store/projectStore'
import { playheadClock } from '../../store/transport'
import { NotesPanel } from './NotesPanel'

const s = () => useProject.getState()

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
  playheadClock.set(0)
})

const renderPanel = () => render(<NotesPanel />, { wrapper: MemoryRouter })

describe('the notes panel on the stage', () => {
  it('says there are no notes yet, and links to where they are written', () => {
    renderPanel()
    expect(screen.getByText('No notes yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit notes on the Resources tab' })).toHaveAttribute('href', '/resources')
  })

  it('shows the whole-dance notes, and says when the current section has none', () => {
    s().addNote({ text: 'Smile!' })
    renderPanel()
    expect(screen.getByText('No notes for this section.')).toBeInTheDocument()
    const whole = screen.getByRole('heading', { name: 'Whole dance' }).parentElement!
    expect(within(whole).getByText('Smile!')).toBeInTheDocument()
  })

  it('shows the current section’s notes with the count, and the part as a tag', () => {
    const part = s().addPart()!
    s().addNote({ text: 'Arms up on 5-6', anchor: { kind: 'count', count: 4 }, partId: part })
    s().addNote({ text: 'Face the back', anchor: { kind: 'section', sectionId: s().sections[0].id } })
    renderPanel()
    expect(screen.getByRole('heading', { name: s().sections[0].name })).toBeInTheDocument()
    const item = screen.getByText('Arms up on 5-6').closest('li')!
    expect(item).toHaveTextContent('Set 1 · Count 5')
    expect(item).toHaveTextContent(s().parts.find((p) => p.id === part)!.name)
    expect(screen.getByText('Face the back').closest('li')).not.toHaveTextContent('Count')
  })

  it('highlights the count note the playhead has reached, and moves on as it passes the next', () => {
    s().addNote({ text: 'First', anchor: { kind: 'count', count: 2 } })
    s().addNote({ text: 'Second', anchor: { kind: 'count', count: 6 } })
    renderPanel()
    const now = () => screen.queryAllByRole('listitem').filter((li) => li.getAttribute('aria-current') === 'true').map((li) => li.textContent)
    expect(now()).toEqual([])

    act(() => playheadClock.set(2.4))
    expect(now()).toEqual([expect.stringContaining('First')])
    act(() => playheadClock.set(5))
    expect(now()).toEqual([expect.stringContaining('First')])
    act(() => playheadClock.set(6))
    expect(now()).toEqual([expect.stringContaining('Second')])
  })

  it('changes section with the playhead', () => {
    const second = s().addSection()
    s().addNote({ text: 'Only in the second', anchor: { kind: 'section', sectionId: second } })
    renderPanel()
    expect(screen.queryByText('Only in the second')).not.toBeInTheDocument()
    act(() => playheadClock.set(s().sections[1].startCount))
    expect(screen.getByText('Only in the second')).toBeInTheDocument()
  })

  it('shows note text as plain text, never as markup', () => {
    s().addNote({ text: '<img src=x onerror=alert(1)>' })
    const { container } = renderPanel()
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
  })
})
