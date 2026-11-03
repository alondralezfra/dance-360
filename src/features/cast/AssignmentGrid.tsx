import { Link } from 'react-router'
import { Select } from '../../components/ui/Select'
import { cn } from '../../lib/cn'
import { findGaps } from '../../model/parts'
import { formatCount } from '../../model/tempo'
import { useProject } from '../../store/projectStore'
import { PartSwatch } from './PartSwatch'

/** Dancers down the side, sections across the top; each cell is that dancer's part for that section. */
export function AssignmentGrid() {
  const dancers = useProject((s) => s.dancers)
  const sections = useProject((s) => s.sections)
  const parts = useProject((s) => s.parts)
  const assignments = useProject((s) => s.assignments)
  const assignDancer = useProject((s) => s.assignDancer)

  const gaps = findGaps(dancers, sections, assignments, parts)
  const isGap = (dancerId: string, sectionId: string) =>
    gaps.some((g) => g.dancerId === dancerId && g.sectionId === sectionId)
  const dancerName = (id: string) => dancers.find((d) => d.id === id)?.name ?? ''
  const sectionName = (id: string) => sections.find((s) => s.id === id)?.name ?? ''

  return (
    <section aria-labelledby="assignments-heading">
      <h2 id="assignments-heading" className="text-lg font-semibold">
        Assignments
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">Which part each dancer is in, section by section.</p>

      {dancers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
          No dancers yet.{' '}
          <Link to="../stage" className="text-primary underline">
            Add dancers on the Stage tab
          </Link>{' '}
          to assign them to parts.
        </p>
      ) : (
        <>
          <div role="status" className={cn('mb-3 text-sm', gaps.length ? 'text-danger' : 'text-muted-foreground')}>
            {gaps.length === 0
              ? 'Everyone has a part in every section.'
              : `${gaps.length} missing assignment${gaps.length === 1 ? '' : 's'}`}
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            {/* min-w-max keeps cells a usable width; on narrow screens the grid scrolls sideways inside this box */}
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="bg-surface-hover text-left">
                  <th scope="col" className="sticky left-0 bg-surface-hover px-3 py-2 font-medium">
                    Dancer
                  </th>
                  {sections.map((section) => (
                    <th key={section.id} scope="col" className="min-w-40 px-3 py-2 font-medium">
                      <div>{section.name}</div>
                      <div className="text-xs font-normal text-muted-foreground">{formatCount(section.startCount)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dancers.map((dancer) => (
                  <tr key={dancer.id} className="border-t border-border">
                    <th scope="row" className="sticky left-0 bg-surface px-3 py-2 text-left font-medium">
                      {dancer.name}
                    </th>
                    {sections.map((section) => {
                      const partId = assignments[section.id]?.[dancer.id]
                      const part = parts.find((p) => p.id === partId)
                      const gap = isGap(dancer.id, section.id)
                      return (
                        <td key={section.id} className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <PartSwatch color={part?.color} />
                            <Select
                              value={part ? part.id : ''}
                              onChange={(e) => assignDancer(section.id, dancer.id, e.target.value || null)}
                              aria-label={`${dancer.name}, ${section.name}`}
                              aria-invalid={gap}
                              className={cn('min-w-36 flex-1', gap && 'border-danger')}
                            >
                              <option value="">No part</option>
                              {parts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {gaps.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground">
              {gaps.map((g) => (
                <li key={`${g.sectionId}:${g.dancerId}`}>
                  {dancerName(g.dancerId)} has no part in {sectionName(g.sectionId)}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
