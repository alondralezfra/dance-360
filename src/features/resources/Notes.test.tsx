// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../../model/project'
import { useProject } from '../../store/projectStore'
import { ResourcesPage } from './ResourcesPage'

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
})

const s = () => useProject.getState()
const form = () => screen.getByLabelText('Text of the new note')
const about = (label: string) => screen.getByLabelText(`About ${label}`)

describe('the Notes section', () => {
  it('says there are no notes yet, and what notes are for', () => {
    render(<ResourcesPage />)
    expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument()
    expect(screen.getByText(/No notes yet/)).toBeInTheDocument()
  })

  it('lists the project’s notes, each with named controls', () => {
    s().addNote({ text: 'Arms up on 5-6', anchor: { kind: 'count', count: 12 } })
    render(<ResourcesPage />)
    expect(screen.getByLabelText('Text of note 1')).toHaveValue('Arms up on 5-6')
    expect(about('note 1')).toHaveValue('count')
    expect(screen.getByLabelText('Set of note 1')).toHaveValue('2')
    expect(screen.getByLabelText('Count of note 1')).toHaveValue('5')
    expect(screen.getByLabelText('Part of note 1')).toHaveValue('')
    expect(screen.queryByText(/No notes yet/)).not.toBeInTheDocument()
  })

  it('shows Set and Count only for a note about a count', () => {
    s().addNote({ text: 'whole' })
    render(<ResourcesPage />)
    expect(about('note 1')).toHaveValue('dance')
    expect(screen.queryByLabelText('Set of note 1')).not.toBeInTheDocument()
  })
})

describe('adding a note', () => {
  it('adds the note from the form, about the whole dance by default, and clears the text', async () => {
    const user = userEvent.setup()
    render(<ResourcesPage />)
    await user.type(form(), 'Arms up on 5-6')
    await user.click(screen.getByRole('button', { name: '+ Add note' }))
    expect(s().notes).toMatchObject([{ text: 'Arms up on 5-6', anchor: { kind: 'dance' }, partId: null }])
    expect(screen.getByLabelText('Text of note 1')).toHaveValue('Arms up on 5-6')
    expect(form()).toHaveValue('')
  })

  it('keeps line breaks, and Ctrl+Enter adds the note from the text box', async () => {
    const user = userEvent.setup()
    render(<ResourcesPage />)
    await user.type(form(), 'line one{Enter}line two{Control>}{Enter}{/Control}')
    expect(s().notes[0].text).toBe('line one\nline two')
  })

  it('refuses a blank note, saying so, and clears the message when typing starts', async () => {
    const user = userEvent.setup()
    render(<ResourcesPage />)
    await user.type(form(), '   ')
    await user.click(screen.getByRole('button', { name: '+ Add note' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Write the note first.')
    expect(form()).toBeInvalid()
    expect(s().notes).toEqual([])
    await user.type(form(), 'x')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('can be about a section, a count, and a part', async () => {
    const user = userEvent.setup()
    const second = s().addSection()
    const part = s().addPart()!
    render(<ResourcesPage />)
    await user.selectOptions(about('the new note'), `section:${second}`)
    await user.selectOptions(screen.getByLabelText('Part of the new note'), part)
    await user.type(form(), 'Chorus note')
    await user.click(screen.getByRole('button', { name: '+ Add note' }))
    expect(s().notes[0]).toMatchObject({ anchor: { kind: 'section', sectionId: second }, partId: part })

    await user.selectOptions(about('the new note'), 'count')
    const set = screen.getByLabelText('Set of the new note')
    await user.clear(set)
    await user.type(set, '3{Enter}')
    const count = screen.getByLabelText('Count of the new note')
    await user.clear(count)
    await user.type(count, '5{Enter}')
    await user.type(form(), 'Hit the pose')
    await user.click(screen.getByRole('button', { name: '+ Add note' }))
    expect(s().notes[1]).toMatchObject({ text: 'Hit the pose', anchor: { kind: 'count', count: 20 } })
  })

  it('keeps what the last note was about, for a run of notes about one place', async () => {
    const user = userEvent.setup()
    const second = s().addSection()
    render(<ResourcesPage />)
    await user.selectOptions(about('the new note'), `section:${second}`)
    await user.type(form(), 'one')
    await user.click(screen.getByRole('button', { name: '+ Add note' }))
    expect(about('the new note')).toHaveValue(`section:${second}`)
    await user.type(form(), 'two')
    await user.click(screen.getByRole('button', { name: '+ Add note' }))
    expect(s().notes.map((n) => n.anchor)).toEqual([
      { kind: 'section', sectionId: second },
      { kind: 'section', sectionId: second },
    ])
  })

  it('offers the whole dance, each section, and a count; and any part and each part', () => {
    s().addSection()
    s().addPart()
    render(<ResourcesPage />)
    const options = (el: HTMLElement) => within(el).getAllByRole('option').map((o) => o.textContent)
    expect(options(about('the new note'))).toEqual(['Whole dance', 'Section 1', 'Section 2', 'A count'])
    expect(options(screen.getByLabelText('Part of the new note'))).toEqual(['Any part', 'Everyone', 'Part A'])
  })
})

describe('changing a note', () => {
  it('edits the text in place, one line break at a time', async () => {
    const user = userEvent.setup()
    s().addNote({ text: 'Arms' })
    render(<ResourcesPage />)
    await user.type(screen.getByLabelText('Text of note 1'), ' up{Enter}hold')
    expect(s().notes[0].text).toBe('Arms up\nhold')
  })

  it('changes what a note is about, and which part', async () => {
    const user = userEvent.setup()
    const second = s().addSection()
    const part = s().addPart()!
    s().addNote({ text: 'n' })
    render(<ResourcesPage />)
    await user.selectOptions(about('note 1'), `section:${second}`)
    expect(s().notes[0].anchor).toEqual({ kind: 'section', sectionId: second })
    await user.selectOptions(about('note 1'), 'count')
    expect(s().notes[0].anchor).toEqual({ kind: 'count', count: 0 }) // starts at Set 1, Count 1
    await user.selectOptions(screen.getByLabelText('Part of note 1'), part)
    expect(s().notes[0].partId).toBe(part)
    await user.selectOptions(screen.getByLabelText('Part of note 1'), '')
    await user.selectOptions(about('note 1'), 'dance')
    expect(s().notes[0]).toMatchObject({ anchor: { kind: 'dance' }, partId: null })
  })

  it('moves a note to another count with Set and Count, and ignores nonsense', async () => {
    const user = userEvent.setup()
    s().addNote({ text: 'n', anchor: { kind: 'count', count: 0 } })
    render(<ResourcesPage />)
    const set = () => screen.getByLabelText('Set of note 1')
    await user.clear(set())
    await user.type(set(), '4{Enter}')
    expect(s().notes[0].anchor).toEqual({ kind: 'count', count: 24 })
    await user.clear(set())
    await user.type(set(), 'abc{Enter}')
    expect(s().notes[0].anchor).toEqual({ kind: 'count', count: 24 })
    const count = screen.getByLabelText('Count of note 1')
    await user.clear(count)
    await user.type(count, '99{Enter}') // held at the end of the set
    expect(s().notes[0].anchor).toEqual({ kind: 'count', count: 31 })
  })
})

describe('removing a note', () => {
  it('removes just that note', async () => {
    const user = userEvent.setup()
    s().addNote({ text: 'One' })
    s().addNote({ text: 'Two' })
    render(<ResourcesPage />)
    await user.click(screen.getByRole('button', { name: 'Remove note 1' }))
    expect(s().notes.map((n) => n.text)).toEqual(['Two'])
    expect(screen.queryByLabelText('Text of note 2')).not.toBeInTheDocument()
  })
})

describe('organised by section', () => {
  it('lists whole-dance notes first, then each section in song order; in a section its own notes, then counts in order', () => {
    const second = s().addSection() // starts at count 16
    s().addNote({ text: 'late count', anchor: { kind: 'count', count: 30 } })
    s().addNote({ text: 'whole' })
    s().addNote({ text: 'chorus note', anchor: { kind: 'section', sectionId: second } })
    s().addNote({ text: 'early count', anchor: { kind: 'count', count: 17 } })
    s().addNote({ text: 'verse count', anchor: { kind: 'count', count: 3 } })
    render(<ResourcesPage />)
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Whole dance', 'Section 1', 'Section 2'])
    const texts = screen.getAllByLabelText(/^Text of note/).map((el) => (el as HTMLTextAreaElement).value)
    expect(texts).toEqual(['whole', 'verse count', 'chorus note', 'early count', 'late count'])
    expect(screen.getByLabelText('Text of note 1')).toHaveValue('late count') // numbered by when it was added
  })

  it('files a note under another heading when what it is about changes, and under Whole dance when its section is removed', async () => {
    const user = userEvent.setup()
    const second = s().addSection()
    s().addNote({ text: 'n' })
    render(<ResourcesPage />)
    await user.selectOptions(about('note 1'), `section:${second}`)
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Section 2'])
    s().removeSection(second)
    expect(await screen.findByRole('heading', { level: 3, name: 'Whole dance' })).toBeInTheDocument()
    expect(about('note 1')).toHaveValue('dance')
  })
})
