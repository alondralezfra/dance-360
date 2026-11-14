import { NumberField } from '../../components/ui/NumberField'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { COUNTS_PER_SET, fromSetAndCount, toSetAndCount } from '../../model/tempo'
import { useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'
import { FormationList } from './FormationList'

export function FormationStrip() {
  const formations = useProject((s) => s.formations)
  const currentId = useUi((s) => s.currentFormationId)
  const selectFormation = useUi((s) => s.selectFormation)
  const addFormation = useProject((s) => s.addFormation)
  const removeFormation = useProject((s) => s.removeFormation)
  const reorderFormation = useProject((s) => s.reorderFormation)
  const renameFormation = useProject((s) => s.renameFormation)
  const setFormationCount = useProject((s) => s.setFormationCount)
  const setFormationTransition = useProject((s) => s.setFormationTransition)

  // The stored selection can be stale (e.g. nothing selected yet), so fall back to the first.
  const found = formations.findIndex((f) => f.id === currentId)
  const index = found === -1 ? 0 : found
  const current = formations[index]
  const at = toSetAndCount(current.count)

  const handleAdd = () => selectFormation(addFormation(current.id))

  const handleDelete = () => {
    const next = formations[index > 0 ? index - 1 : 1]
    removeFormation(current.id)
    selectFormation(next.id)
  }

  return (
    <div className="flex flex-col gap-0.5 px-2 pb-1">
      <div className="flex flex-wrap items-center gap-2">
        <IconButton
          icon="chevronLeft"
          label="Previous formation"
          onClick={() => selectFormation(formations[index - 1].id)}
          disabled={index <= 0}
        />
        <Input
          value={current.name}
          onChange={(e) => renameFormation(current.id, e.target.value)}
          className="w-40 font-medium"
          aria-label="Formation name"
        />
        <IconButton
          icon="chevronRight"
          label="Next formation"
          onClick={() => selectFormation(formations[index + 1].id)}
          disabled={index >= formations.length - 1}
        />
        <span className="text-sm text-muted-foreground">
          {index + 1} of {formations.length}
        </span>
        {/* When this formation lands in the song, and how long dancers take to get there. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <NumberField
            label="Set"
            min={1}
            value={at.set}
            onCommit={(set) => setFormationCount(current.id, fromSetAndCount(set, at.count))}
          />
          <NumberField
            label="Count"
            min={1}
            max={COUNTS_PER_SET}
            value={at.count}
            onCommit={(count) => setFormationCount(current.id, fromSetAndCount(at.set, count))}
          />
          <NumberField
            label="Travel counts"
            min={0}
            value={current.transitionCounts}
            onCommit={(n) => setFormationTransition(current.id, n)}
          />
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="primary" onClick={handleAdd}>
            + New formation
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={formations.length <= 1}>
            Delete
          </Button>
        </div>
      </div>

      <FormationList
        formations={formations}
        currentId={current.id}
        onSelect={selectFormation}
        onReorder={reorderFormation}
      />
    </div>
  )
}
