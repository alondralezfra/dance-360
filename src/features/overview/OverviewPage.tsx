import { Link } from 'react-router'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { findProblems, type Problem } from '../../model/problems'
import { useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'

const rowClass =
  'flex min-h-11 flex-col justify-center rounded-lg border border-border bg-surface px-3 py-2 hover:border-border-strong'

/** Where a problem is fixed: parts are assigned on Cast & Parts, dots are placed on the Stage. */
function ProblemRow({ problem }: { problem: Problem }) {
  const selectFormation = useUi((s) => s.selectFormation)
  const to = problem.kind === 'no-part' ? '../cast' : '../stage'
  return (
    <li>
      <Link
        to={to}
        className={rowClass}
        onClick={() => {
          if (problem.kind === 'not-placed') selectFormation(problem.formationId)
        }}
      >
        <span className="text-sm font-medium">{problem.message}</span>
        <span className="text-xs text-muted-foreground">{problem.detail}</span>
      </Link>
    </li>
  )
}

/** The Overview tab: a summary of the project and the problems worth fixing. */
export function OverviewPage() {
  const dancers = useProject((s) => s.dancers)
  const parts = useProject((s) => s.parts)
  const sections = useProject((s) => s.sections)
  const assignments = useProject((s) => s.assignments)
  const formations = useProject((s) => s.formations)
  const song = useProject((s) => s.song)
  const problems = findProblems({ dancers, parts, sections, assignments, formations })

  const facts = [
    ['Song', song ? song.name : 'None yet'],
    ['Dancers', String(dancers.length)],
    ['Formations', String(formations.length)],
    ['Sections', String(sections.length)],
  ]

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 p-4">
        <section aria-labelledby="summary-heading">
          <SectionHeader id="summary-heading" title="Overview" />
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {facts.map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="truncate text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="problems-heading">
          <SectionHeader id="problems-heading" title="Problems">
            Things to fix before you rehearse. Choose one to go where it is fixed.
          </SectionHeader>
          {problems.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
              No problems: every dancer has a part in each section and is placed in every formation.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2">
              {problems.map((p) => (
                <ProblemRow key={p.kind === 'no-part' ? `s-${p.sectionId}` : `f-${p.formationId}`} problem={p} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
