// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../../model/project'
import { useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'
import { PartLegend } from './PartLegend'

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
  useUi.getState().reset()
})

const s = () => useProject.getState()

describe('PartLegend', () => {
  it('shows the current section and every part', () => {
    s().addPart()
    render(<PartLegend />)
    const legend = screen.getByRole('group', { name: 'Parts legend' })
    expect(within(legend).getByText('Section 1')).toBeInTheDocument()
    expect(within(legend).getByText('Everyone')).toBeInTheDocument()
    expect(within(legend).getByText('Part A')).toBeInTheDocument()
  })

  it('follows the section the selected formation is in', () => {
    const first = s().formations[0].id
    const second = s().addFormation(first)
    s().setFormationCount(second, 20)
    s().renameSection(s().sections[0].id, 'Intro')
    const chorus = s().addSection() // starts at count 16
    s().renameSection(chorus, 'Chorus')

    render(<PartLegend />)
    expect(screen.getByText('Intro')).toBeInTheDocument()

    act(() => useUi.getState().selectFormation(second))
    expect(screen.getByText('Chorus')).toBeInTheDocument()
    expect(screen.queryByText('Intro')).not.toBeInTheDocument()
  })

  it('lists only the parts that apply in the current section', () => {
    // Everyone (all sections); Floor only in the second section (which starts at count 16)
    const floor = s().addPart()!
    s().renamePart(floor, 'Floor')
    const second = s().addSection()
    s().setPartSections(floor, [second])
    const formation2 = s().addFormation(s().formations[0].id)
    s().setFormationCount(formation2, 20) // inside the second section

    render(<PartLegend />)
    let legend = screen.getByRole('group', { name: 'Parts legend' })
    expect(within(legend).getByText('Everyone')).toBeInTheDocument() // formation 1 is in section 1
    expect(within(legend).queryByText('Floor')).not.toBeInTheDocument()

    act(() => useUi.getState().selectFormation(formation2))
    legend = screen.getByRole('group', { name: 'Parts legend' })
    expect(within(legend).getByText('Floor')).toBeInTheDocument()
    expect(within(legend).queryByText('Everyone')).not.toBeInTheDocument() // Floor replaces it here
  })

  it('shows the section and "Everyone" when no part applies there', () => {
    s().removePart(s().parts[0].id)
    render(<PartLegend />)
    const legend = screen.getByRole('group', { name: 'Parts legend' })
    expect(within(legend).getByText('Section 1')).toBeInTheDocument()
    expect(within(legend).getByText('Everyone')).toBeInTheDocument()
  })

  it('says "Everyone" only in a section no part applies in, not where a part does', () => {
    s().renamePart(s().parts[0].id, 'Floor') // (the default part is itself called "Everyone")
    s().addSection()
    s().setPartSections(s().parts[0].id, [s().sections[0].id]) // Floor covers section 1 only
    const formation2 = s().addFormation(s().formations[0].id)
    s().setFormationCount(formation2, 20) // inside section 2

    render(<PartLegend />)
    const legend = () => screen.getByRole('group', { name: 'Parts legend' })
    expect(within(legend()).getByText('Floor')).toBeInTheDocument() // section 1: Floor applies
    expect(within(legend()).queryByText('Everyone')).not.toBeInTheDocument()

    act(() => useUi.getState().selectFormation(formation2))
    expect(within(legend()).queryByText('Floor')).not.toBeInTheDocument() // section 2: nothing applies
    expect(within(legend()).getByText('Everyone')).toBeInTheDocument()
  })

  it('renders nothing when there are neither parts nor sections', () => {
    useProject.setState({ parts: [], sections: [] })
    const { container } = render(<PartLegend />)
    expect(container).toBeEmptyDOMElement()
  })
})
