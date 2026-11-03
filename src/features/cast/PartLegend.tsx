import { sectionIndexAt } from '../../model/parts'
import { useCurrentFormation, useProject } from '../../store/projectStore'
import { PartSwatch } from './PartSwatch'

const chip = 'inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-xs text-foreground shadow'

/** Over the stage: which section we're in and what each part colour means. */
export function PartLegend() {
  const parts = useProject((s) => s.parts)
  const sections = useProject((s) => s.sections)
  const formation = useCurrentFormation()
  const section = sections[sectionIndexAt(sections, formation.count)]

  if (parts.length === 0 && !section) return null
  return (
    <div
      role="group"
      aria-label="Parts legend"
      className="pointer-events-none absolute right-2 top-2 z-10 flex max-w-[60%] flex-wrap justify-end gap-1.5"
    >
      {section && <span className={`${chip} font-medium`}>{section.name}</span>}
      {parts.map((part) => (
        <span key={part.id} className={chip}>
          <PartSwatch color={part.color} className="h-3 w-3" />
          {part.name}
        </span>
      ))}
    </div>
  )
}
