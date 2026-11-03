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
    expect(within(legend).getByText('Part A')).toBeInTheDocument()
    expect(within(legend).getByText('Part B')).toBeInTheDocument()
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

  it('still shows the section when there are no parts', () => {
    s().removePart(s().parts[0].id)
    render(<PartLegend />)
    expect(screen.getByText('Section 1')).toBeInTheDocument()
  })

  it('renders nothing when there are neither parts nor sections', () => {
    useProject.setState({ parts: [], sections: [] })
    const { container } = render(<PartLegend />)
    expect(container).toBeEmptyDOMElement()
  })
})
