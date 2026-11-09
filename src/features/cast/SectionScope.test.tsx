// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../../model/project'
import { useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'
import { CastPage } from './CastPage'

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
  useUi.getState().reset()
})

const s = () => useProject.getState()
const renderPage = () =>
  render(
    <MemoryRouter>
      <CastPage />
    </MemoryRouter>,
  )

/** Sections Intro, Chorus 1, Verse, Chorus 2 and parts Part A, Floor, Standing. */
function setup() {
  s().renameSection(s().sections[0].id, 'Intro')
  const chorus1 = s().addSection()
  s().renameSection(chorus1, 'Chorus 1')
  const verse = s().addSection()
  s().renameSection(verse, 'Verse')
  const chorus2 = s().addSection()
  s().renameSection(chorus2, 'Chorus 2')
  s().addPart()
  s().addPart()
  s().renamePart(s().parts[1].id, 'Floor')
  s().renamePart(s().parts[2].id, 'Standing')
  return { chorus1, verse, chorus2 }
}

const scopeButton = (partNumber: number) => screen.getByRole('button', { name: `Sections of part ${partNumber}` })

async function openScope(user: ReturnType<typeof userEvent.setup>, partNumber: number) {
  await user.click(scopeButton(partNumber))
  return screen.getByRole('dialog', { name: `Sections of part ${partNumber}` })
}

describe('choosing which sections a part applies to', () => {
  it('a part starts on "All sections"', () => {
    renderPage()
    expect(scopeButton(1)).toHaveTextContent('All sections')
  })

  it('lists "All sections" and every section as checkboxes', async () => {
    setup()
    const user = userEvent.setup()
    renderPage()
    const dialog = await openScope(user, 2)
    expect(within(dialog).getByRole('checkbox', { name: 'All sections' })).toBeChecked()
    for (const name of ['Intro', 'Chorus 1', 'Verse', 'Chorus 2']) {
      expect(within(dialog).getByRole('checkbox', { name })).not.toBeChecked()
    }
  })

  it('picks any combination of sections, not just neighbours', async () => {
    const { chorus1, chorus2 } = setup()
    const user = userEvent.setup()
    renderPage()
    const dialog = await openScope(user, 2)

    await user.click(within(dialog).getByRole('checkbox', { name: 'Chorus 1' }))
    expect(scopeButton(2)).toHaveTextContent('Chorus 1')
    expect(within(dialog).getByRole('checkbox', { name: 'All sections' })).not.toBeChecked()

    await user.click(within(dialog).getByRole('checkbox', { name: 'Chorus 2' }))
    expect(scopeButton(2)).toHaveTextContent('Chorus 1, Chorus 2')
    expect(s().parts[1].sectionIds).toEqual([chorus1, chorus2])
  })

  it('unticking removes a section, and unticking the last one goes back to all sections', async () => {
    setup()
    const user = userEvent.setup()
    renderPage()
    const dialog = await openScope(user, 2)
    await user.click(within(dialog).getByRole('checkbox', { name: 'Chorus 1' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Chorus 2' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Chorus 1' }))
    expect(scopeButton(2)).toHaveTextContent('Chorus 2')
    await user.click(within(dialog).getByRole('checkbox', { name: 'Chorus 2' }))
    expect(scopeButton(2)).toHaveTextContent('All sections')
  })

  it('"All sections" resets a limited part', async () => {
    setup()
    const user = userEvent.setup()
    renderPage()
    const dialog = await openScope(user, 2)
    await user.click(within(dialog).getByRole('checkbox', { name: 'Chorus 1' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'All sections' }))
    expect(s().parts[1].sectionIds).toBeNull()
    expect(scopeButton(2)).toHaveTextContent('All sections')
  })

  it('shows "No sections" for a part left applying nowhere', () => {
    setup()
    s().setPartSections(s().parts[1].id, [])
    renderPage()
    expect(scopeButton(2)).toHaveTextContent('No sections')
  })

  it('closes with Escape', async () => {
    setup()
    const user = userEvent.setup()
    renderPage()
    await openScope(user, 2)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('the assignment grid with limited parts', () => {
  it('the choruses-only case: nothing missing outside the choruses, then nothing at all once they are picked', async () => {
    const { chorus1, chorus2 } = setup()
    s().addDancer('Maya')
    s().addDancer('Jordan')
    const user = userEvent.setup()
    renderPage()

    // Floor and Standing (parts 2 and 3) apply only in the two choruses.
    for (const partNumber of [2, 3]) {
      const dialog = await openScope(user, partNumber)
      await user.click(within(dialog).getByRole('checkbox', { name: 'Chorus 1' }))
      await user.click(within(dialog).getByRole('checkbox', { name: 'Chorus 2' }))
      await user.keyboard('{Escape}')
    }
    expect(s().parts[1].sectionIds).toEqual([chorus1, chorus2])

    // Only the 4 chorus cells (2 dancers x 2 choruses) are missing; Intro and Verse never are.
    expect(screen.getByRole('status')).toHaveTextContent('4 missing assignments')
    expect(screen.queryByText(/has no part in (Intro|Verse)/)).not.toBeInTheDocument()
    expect(screen.getByText('Maya has no part in Chorus 1')).toBeInTheDocument()

    for (const dancer of ['Maya', 'Jordan']) {
      for (const section of ['Chorus 1', 'Chorus 2']) {
        await user.selectOptions(screen.getByLabelText(`${dancer}, ${section}`), 'Floor')
      }
    }
    expect(screen.getByRole('status')).toHaveTextContent('No missing assignments.')
  })

  it('shows the single part read-only where only one applies, and a dropdown where several do', () => {
    setup()
    s().addDancer('Maya')
    for (const id of [s().parts[1].id, s().parts[2].id]) s().setPartSections(id, [s().sections[1].id])
    renderPage()

    // Intro: only Part A applies, so there is nothing to pick
    expect(screen.queryByLabelText('Maya, Intro')).not.toBeInTheDocument()
    const mayaRow = within(screen.getByRole('table')).getByRole('rowheader', { name: 'Maya' }).closest('tr')!
    expect(within(mayaRow).getByText(/Maya, Intro: automatic/)).toBeInTheDocument()

    // Chorus 1: Floor and Standing apply, so there is a dropdown
    expect(screen.getByLabelText('Maya, Chorus 1')).toBeInTheDocument()
  })

  it('a cell only offers the parts that apply in its section', () => {
    setup()
    s().addDancer('Maya')
    for (const id of [s().parts[1].id, s().parts[2].id]) s().setPartSections(id, [s().sections[1].id])
    renderPage()
    const options = within(screen.getByLabelText('Maya, Chorus 1')).getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['No part', 'Floor', 'Standing']) // not Part A
  })

  it('adding a section keeps the previous section’s parts (a Chorus 3 straight after Chorus 2)', async () => {
    setup()
    for (const id of [s().parts[1].id, s().parts[2].id]) s().setPartSections(id, [s().sections[3].id])
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: '+ Add section' }))
    expect(scopeButton(2)).toHaveTextContent('Chorus 2, Section 5')
  })

  it('a one-part project needs no assignments at all', () => {
    s().addDancer('Maya')
    s().addDancer('Jordan')
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('No missing assignments.')
    expect(screen.queryByRole('combobox', { name: /Maya/ })).not.toBeInTheDocument()
  })
})

describe('a section where no part applies (everyone dances together)', () => {
  /** The Verse 1 / Chorus case: Floor and Standing exist only in Verse 1, so Chorus has no part at all. */
  function verseOnly() {
    s().renameSection(s().sections[0].id, 'Verse 1')
    const chorus = s().addSection()
    s().renameSection(chorus, 'Chorus')
    s().renamePart(s().parts[0].id, 'Floor')
    s().addPart()
    s().renamePart(s().parts[1].id, 'Standing')
    for (const part of s().parts) s().setPartSections(part.id, [s().sections[0].id])
    return chorus
  }

  it('is not an error, and the cell reads "Everyone" instead of a dead-end dropdown', () => {
    verseOnly()
    s().addDancer('Maya')
    s().addDancer('Jordan')
    s().assignDancer(s().sections[0].id, s().dancers[0].id, s().parts[0].id)
    s().assignDancer(s().sections[0].id, s().dancers[1].id, s().parts[1].id)
    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('No missing assignments')
    expect(screen.queryByLabelText('Maya, Chorus')).not.toBeInTheDocument()
    expect(screen.getByText(/Maya, Chorus: no parts apply/)).toBeInTheDocument()
    expect(screen.getByLabelText('Maya, Verse 1')).toBeInTheDocument() // Verse 1 still needs a choice
  })

  it('only the section that really needs choices is flagged', () => {
    verseOnly()
    s().addDancer('Maya')
    s().addDancer('Jordan')
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('2 missing assignments')
    expect(screen.getByText('Maya has no part in Verse 1')).toBeInTheDocument()
    expect(screen.queryByText(/has no part in Chorus/)).not.toBeInTheDocument()
  })

  it('becomes a normal section again as soon as a part covers it', async () => {
    const chorus = verseOnly()
    s().addDancer('Maya')
    s().setPartSections(s().parts[0].id, [s().sections[0].id, chorus])
    renderPage()
    // only Floor applies in the chorus now, so Maya is in it automatically
    expect(screen.getByText(/Maya, Chorus: automatic/)).toBeInTheDocument()
  })
})
