// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../../model/project'
import { useProject } from '../../store/projectStore'
import { CommittedInput } from './CommittedInput'
import { ResourcesPage } from './ResourcesPage'

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
})

const s = () => useProject.getState()
const web = (over: Record<string, unknown> = {}) => ({ title: 'Chorus tutorial', url: 'https://www.youtube.com/watch?v=abc', ...over })

describe('the Links section', () => {
  it('says there are no links yet, and says what Links are for', () => {
    render(<ResourcesPage />)
    expect(screen.getByRole('heading', { name: 'Links' })).toBeInTheDocument()
    expect(screen.getByText(/No links yet/)).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('lists the project’s links, each with named controls', () => {
    s().addResource(web())
    render(<ResourcesPage />)
    expect(screen.getByLabelText('Title of link 1')).toHaveValue('Chorus tutorial')
    expect(screen.getByLabelText('Kind of link 1')).toHaveValue('other')
    expect(screen.getByLabelText('Section of link 1')).toHaveValue('')
    expect(screen.getByLabelText('Part of link 1')).toHaveValue('')
    expect(screen.getByLabelText('Start time of link 1')).toHaveValue('')
    expect(screen.getByLabelText('Web address of link 1')).toHaveValue('https://www.youtube.com/watch?v=abc')
    expect(screen.queryByText(/No links yet/)).not.toBeInTheDocument()
  })
})

describe('adding a link', () => {
  it('adds the link from the form, tidies the address, and clears the form', async () => {
    const user = userEvent.setup()
    render(<ResourcesPage />)
    await user.type(screen.getByLabelText('Web address of the new link'), 'youtube.com/watch?v=abc')
    await user.type(screen.getByLabelText('Title of the new link'), 'Chorus tutorial')
    await user.click(screen.getByRole('button', { name: '+ Add link' }))
    expect(s().resources).toMatchObject([{ title: 'Chorus tutorial', url: 'https://youtube.com/watch?v=abc', kind: 'other' }])
    expect(screen.getByLabelText('Title of link 1')).toHaveValue('Chorus tutorial')
    expect(screen.getByLabelText('Web address of the new link')).toHaveValue('')
    expect(screen.getByLabelText('Title of the new link')).toHaveValue('')
  })

  it('names the link after its site when no title is given, and Enter in the form adds it', async () => {
    const user = userEvent.setup()
    render(<ResourcesPage />)
    await user.type(screen.getByLabelText('Web address of the new link'), 'https://www.youtube.com/watch?v=abc{Enter}')
    expect(s().resources[0].title).toBe('youtube.com')
  })

  it('refuses an empty address and one that is not a web link, saying why, and adds nothing', async () => {
    const user = userEvent.setup()
    render(<ResourcesPage />)
    await user.click(screen.getByRole('button', { name: '+ Add link' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Paste a web address first.')
    expect(screen.getByLabelText('Web address of the new link')).toBeInvalid()

    await user.type(screen.getByLabelText('Web address of the new link'), 'javascript:alert(1)')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument() // typing clears the message
    await user.click(screen.getByRole('button', { name: '+ Add link' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/not a web link/)
    expect(s().resources).toEqual([])
    expect(screen.getByLabelText('Web address of the new link')).toHaveValue('javascript:alert(1)') // kept so it can be fixed
  })
})

describe('changing a link', () => {
  it('changes the kind, the section and the part', async () => {
    const user = userEvent.setup()
    const section = s().addSection()
    const part = s().addPart()!
    s().addResource(web())
    render(<ResourcesPage />)
    await user.selectOptions(screen.getByLabelText('Kind of link 1'), 'rehearsal')
    await user.selectOptions(screen.getByLabelText('Section of link 1'), section)
    await user.selectOptions(screen.getByLabelText('Part of link 1'), part)
    expect(s().resources[0]).toMatchObject({ kind: 'rehearsal', sectionId: section, partId: part })
    await user.selectOptions(screen.getByLabelText('Section of link 1'), '')
    await user.selectOptions(screen.getByLabelText('Part of link 1'), '')
    expect(s().resources[0]).toMatchObject({ sectionId: null, partId: null })
  })

  it('offers every kind, the whole dance and each section, and any part and each part', () => {
    s().addSection()
    s().addPart()
    s().addResource(web())
    render(<ResourcesPage />)
    const options = (label: string) => within(screen.getByLabelText(label)).getAllByRole('option').map((o) => o.textContent)
    expect(options('Kind of link 1')).toEqual(['Tutorial video', 'Reference video', 'Rehearsal recording', 'Document', 'Other'])
    expect(options('Section of link 1')).toEqual(['Whole dance', 'Section 1', 'Section 2'])
    expect(options('Part of link 1')).toEqual(['Any part', 'Everyone', 'Part A'])
  })

  it('renames a link as you type, and puts the site name back if the title is left blank', async () => {
    const user = userEvent.setup()
    s().addResource(web())
    render(<ResourcesPage />)
    const title = screen.getByLabelText('Title of link 1')
    await user.clear(title)
    expect(s().resources[0].title).toBe('')
    await user.tab()
    expect(s().resources[0].title).toBe('youtube.com')
    await user.clear(screen.getByLabelText('Title of link 1'))
    await user.type(screen.getByLabelText('Title of link 1'), 'Hips')
    expect(s().resources[0].title).toBe('Hips')
  })

  it('saves a start time in minutes:seconds, shows it tidied, clears it when emptied, and keeps the old one for nonsense', async () => {
    const user = userEvent.setup()
    s().addResource(web())
    render(<ResourcesPage />)
    const start = () => screen.getByLabelText('Start time of link 1')
    await user.type(start(), '83{Enter}')
    expect(s().resources[0].startSec).toBe(83)
    expect(start()).toHaveValue('1:23')
    await user.clear(start())
    await user.type(start(), 'soon{Enter}')
    expect(s().resources[0].startSec).toBe(83)
    expect(start()).toHaveValue('1:23')
    await user.clear(start())
    await user.tab()
    expect(s().resources[0].startSec).toBeNull()
    expect(start()).toHaveValue('')
  })

  it('saves a corrected address, and puts the old one back when the new one is not a web link', async () => {
    const user = userEvent.setup()
    s().addResource(web())
    render(<ResourcesPage />)
    const address = () => screen.getByLabelText('Web address of link 1')
    await user.clear(address())
    await user.type(address(), 'drive.google.com/file/d/1/view{Enter}')
    expect(s().resources[0].url).toBe('https://drive.google.com/file/d/1/view')
    expect(address()).toHaveValue('https://drive.google.com/file/d/1/view')
    await user.clear(address())
    await user.type(address(), 'javascript:alert(1){Enter}')
    expect(s().resources[0].url).toBe('https://drive.google.com/file/d/1/view')
    expect(address()).toHaveValue('https://drive.google.com/file/d/1/view')
  })
})

describe('opening a link', () => {
  it('opens in a new tab without giving the site a way back to the app', () => {
    s().addResource(web())
    render(<ResourcesPage />)
    const open = screen.getByRole('link', { name: 'Open Chorus tutorial in a new tab' })
    expect(open).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abc')
    expect(open).toHaveAttribute('target', '_blank')
    expect(open).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('never makes a link of an address that is not a web address (a damaged or hand-edited project)', () => {
    useProject.setState({
      resources: [{ id: 'bad', title: 'Sneaky', url: 'javascript:alert(1)', kind: 'other', sectionId: null, partId: null, startSec: null }],
    })
    render(<ResourcesPage />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Not a web link')).toBeInTheDocument()
  })
})

describe('removing a link', () => {
  it('removes just that link', async () => {
    const user = userEvent.setup()
    s().addResource(web({ title: 'One' }))
    s().addResource(web({ title: 'Two', url: 'https://b.com' }))
    render(<ResourcesPage />)
    await user.click(screen.getByRole('button', { name: 'Remove One' }))
    expect(s().resources.map((r) => r.title)).toEqual(['Two'])
    expect(screen.queryByLabelText('Title of link 2')).not.toBeInTheDocument()
  })
})

describe('organised by section', () => {
  it('lists whole-dance links first, then each section in song order, under headings', () => {
    const second = s().addSection()
    s().addResource(web({ title: 'In chorus', sectionId: second }))
    s().addResource(web({ title: 'Whole one' }))
    s().addResource(web({ title: 'In verse', sectionId: s().sections[0].id }))
    render(<ResourcesPage />)
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Whole dance', 'Section 1', 'Section 2'])
    const titles = screen.getAllByLabelText(/^Title of link/).map((el) => (el as HTMLInputElement).value)
    expect(titles).toEqual(['Whole one', 'In verse', 'In chorus'])
    // the numbers in the controls' names follow the order added, not the order shown
    expect(screen.getByLabelText('Title of link 1')).toHaveValue('In chorus')
  })

  it('moves a link under another heading when its section changes, and back to Whole dance when the section is removed', async () => {
    const user = userEvent.setup()
    const second = s().addSection()
    s().addResource(web())
    render(<ResourcesPage />)
    await user.selectOptions(screen.getByLabelText('Section of link 1'), second)
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Section 2'])
    s().removeSection(second)
    expect(await screen.findByRole('heading', { level: 3, name: 'Whole dance' })).toBeInTheDocument()
  })
})

describe('CommittedInput', () => {
  const upper = (typed: string) => (typed.trim() === 'no' ? null : typed.toUpperCase())

  it('saves the checked, tidied text when you leave the field, but only if it changed', async () => {
    const user = userEvent.setup()
    const saved: string[] = []
    render(<CommittedInput aria-label="Field" value="A" parse={upper} onCommit={(v) => saved.push(v)} />)
    await user.type(screen.getByLabelText('Field'), 'bc')
    expect(saved).toEqual([]) // nothing is saved while typing
    await user.tab()
    expect(saved).toEqual(['ABC'])
    await user.click(screen.getByLabelText('Field'))
    await user.tab()
    expect(saved).toEqual(['ABC']) // untouched: nothing new
  })

  it('puts back what was there when the text is not acceptable', async () => {
    const user = userEvent.setup()
    const saved: string[] = []
    render(<CommittedInput aria-label="Field" value="A" parse={upper} onCommit={(v) => saved.push(v)} />)
    await user.clear(screen.getByLabelText('Field'))
    await user.type(screen.getByLabelText('Field'), 'no{Enter}')
    expect(saved).toEqual([])
    expect(screen.getByLabelText('Field')).toHaveValue('A')
  })
})
