// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SectionHeader } from './SectionHeader'

describe('SectionHeader', () => {
  it('shows the title as a heading with the given id, and the explanation under it', () => {
    render(
      <SectionHeader id="parts-heading" title="Parts">
        Colour-coded groups.
      </SectionHeader>,
    )
    const heading = screen.getByRole('heading', { name: 'Parts', level: 2 })
    expect(heading).toHaveAttribute('id', 'parts-heading')
    expect(screen.getByText('Colour-coded groups.')).toBeInTheDocument()
  })

  it('names a section that points at it', () => {
    render(
      <section aria-labelledby="s-heading">
        <SectionHeader id="s-heading" title="Sections" />
      </section>,
    )
    expect(screen.getByRole('region', { name: 'Sections' })).toBeInTheDocument()
  })

  it('shows action buttons beside the title', () => {
    render(<SectionHeader id="x" title="Parts" actions={<button>+ Add part</button>} />)
    expect(screen.getByRole('button', { name: '+ Add part' })).toBeInTheDocument()
  })

  it('leaves out the explanation line when there is none', () => {
    const { container } = render(<SectionHeader id="x" title="Parts" />)
    expect(container.querySelector('p')).toBeNull()
  })

  it('takes an extra class for spacing', () => {
    const { container } = render(<SectionHeader id="x" title="Parts" className="mb-0" />)
    expect(container.firstElementChild).toHaveClass('mb-0')
  })
})
