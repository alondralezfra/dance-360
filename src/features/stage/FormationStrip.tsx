import { useId, useState } from 'react'
import { NumberField } from '../../components/ui/NumberField'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { cn } from '../../lib/cn'
import { COUNTS_PER_SET, fromSetAndCount, toSetAndCount } from '../../model/tempo'
import { useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'
import { FormationList } from './FormationList'

export function FormationStrip() {
  const [detailsOpen, setDetailsOpen] = useState(false) // a phone only; wider screens always show them
  const detailsId = useId()
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
    // One wrapping row of items, placed by `order`. From md up: the name row with the timing fields and the buttons, then
    // the chips on their own line. On a phone: the name row; the chips with + New formation beside them; a Formation
    // details toggle; and (when open) the timing fields and Delete, so the bar leaves the stage most of the screen.
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 pb-1 md:gap-y-0.5">
      {/* The name row: a line of its own on a phone, part of the one row from md up. */}
      <div className="flex basis-full items-center gap-2 md:contents">
        <IconButton
          icon="chevronLeft"
          label="Previous formation"
          onClick={() => selectFormation(formations[index - 1].id)}
          disabled={index <= 0}
        />
        <Input
          value={current.name}
          onChange={(e) => renameFormation(current.id, e.target.value)}
          className="min-w-0 grow font-medium md:w-40 md:grow-0"
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
      </div>

      <FormationList
        formations={formations}
        currentId={current.id}
        onSelect={selectFormation}
        onReorder={reorderFormation}
        className="order-1 min-w-0 grow basis-0 md:order-4 md:grow-0 md:basis-full"
      />
      <Button variant="primary" onClick={handleAdd} className="order-2 shrink-0 md:ml-auto">
        + New formation
      </Button>
      <Button
        className="order-3 basis-full md:hidden"
        variant="ghost"
        aria-expanded={detailsOpen}
        aria-controls={detailsId}
        onClick={() => setDetailsOpen(!detailsOpen)}
      >
        Formation details
        <Icon name={detailsOpen ? 'chevronUp' : 'chevronDown'} />
      </Button>
      {/* When this formation lands in the song, and how long dancers take to get there (and Delete). Collapsed on a phone;
          from md up the wrapper disappears (`contents`) so its two children join the row and are ordered around + New formation. */}
      <div id={detailsId} className={cn('order-4 basis-full flex-wrap items-center gap-2 md:contents', detailsOpen ? 'flex' : 'hidden')}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:order-1">
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
        <Button variant="danger" onClick={handleDelete} disabled={formations.length <= 1} className="md:order-3">
          Delete
        </Button>
      </div>
    </div>
  )
}
