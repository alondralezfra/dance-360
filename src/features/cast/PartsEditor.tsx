import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { MAX_PARTS, PART_COLOR_IDS, PART_COLOR_NAMES } from '../../model/parts'
import type { PartColorId } from '../../model/types'
import { useProject } from '../../store/projectStore'
import { PartSwatch } from './PartSwatch'
import { SectionScopeSelect } from './SectionScopeSelect'

export function PartsEditor() {
  const parts = useProject((s) => s.parts)
  const sections = useProject((s) => s.sections)
  const assignments = useProject((s) => s.assignments)
  const setPartSections = useProject((s) => s.setPartSections)
  const addPart = useProject((s) => s.addPart)
  const renamePart = useProject((s) => s.renamePart)
  const setPartColor = useProject((s) => s.setPartColor)
  const removePart = useProject((s) => s.removePart)

  const usedBy = (partId: string) =>
    Object.values(assignments).reduce(
      (n, byDancer) => n + Object.values(byDancer).filter((p) => p === partId).length,
      0,
    )

  const remove = (id: string, name: string) => {
    const n = usedBy(id)
    if (n > 0 && !window.confirm(`Remove "${name}"? ${n} assignment${n === 1 ? '' : 's'} will be cleared.`)) return
    removePart(id)
  }

  return (
    <section aria-labelledby="parts-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <h2 id="parts-heading" className="text-lg font-semibold">
            Parts
          </h2>
          <p className="text-sm text-muted-foreground">
            Colour-coded groups doing different choreography. Limit a part to specific sections if it only applies
            there; where just one part applies, everyone is in it automatically.
          </p>
        </div>
        <Button variant="primary" onClick={addPart} disabled={parts.length >= MAX_PARTS}>
          + Add part
        </Button>
      </div>

      {parts.length === 0 && (
        <p className="rounded-lg border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
          No parts yet. Add one to start assigning dancers.
        </p>
      )}
      {parts.length >= MAX_PARTS && (
        <p className="mb-2 text-sm text-muted-foreground">{MAX_PARTS} parts is the maximum.</p>
      )}

      <ul className="grid grid-cols-1 gap-2">
        {parts.map((part, i) => (
          <li key={part.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2">
            <PartSwatch color={part.color} className="ml-1 h-5 w-5" />
            <Input
              value={part.name}
              onChange={(e) => renamePart(part.id, e.target.value)}
              aria-label={`Name of part ${i + 1}`}
              className="min-w-0 flex-1 basis-32"
            />
            <Select
              value={part.color}
              onChange={(e) => setPartColor(part.id, e.target.value as PartColorId)}
              aria-label={`Colour of part ${i + 1}`}
            >
              {PART_COLOR_IDS.map((id) => (
                <option key={id} value={id}>
                  {PART_COLOR_NAMES[id]}
                </option>
              ))}
            </Select>
            <SectionScopeSelect
              label={`Sections of part ${i + 1}`}
              sections={sections}
              value={part.sectionIds}
              onChange={(value) => setPartSections(part.id, value)}
            />
            <Button
              variant="danger-ghost"
              size="icon"
              className="ml-auto"
              onClick={() => remove(part.id, part.name)}
              aria-label={`Remove ${part.name}`}
              title="Remove part"
            >
              ✕
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
