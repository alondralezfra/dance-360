import {
  closestCenter,
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import type { Formation, Id } from '../../model/types'

interface FormationChipProps {
  formation: Formation
  index: number
  count: number
  selected: boolean
  onSelect: () => void
  onMove: (toIndex: number) => void
}

function FormationChip({ formation, index, count, selected, onSelect, onMove }: FormationChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: formation.id,
  })

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Keyboard reordering. Plain arrows are left alone; Enter/Space still select.
    if (!e.altKey) return
    if (e.key === 'ArrowLeft' && index > 0) onMove(index - 1)
    else if (e.key === 'ArrowRight' && index < count - 1) onMove(index + 1)
    else return
    e.preventDefault()
  }

  return (
    <Button
      variant="chip"
      ref={setNodeRef}
      {...attributes}
      aria-roledescription="sortable formation"
      aria-pressed={selected}
      {...listeners}
      onKeyDown={onKeyDown}
      onClick={onSelect}
      title="Drag to reorder (or Alt + arrow keys)"
      style={{
        transform: transform ? CSS.Translate.toString({ ...transform, y: 0 }) : undefined,
        transition,
      }}
      className={cn(
        'shrink-0 cursor-grab touch-manipulation justify-start gap-1 text-left select-none',
        isDragging && 'relative z-10 cursor-grabbing shadow-lg',
      )}
    >
      <span className="text-subtle-foreground">{index + 1}.</span>
      {formation.name || 'Untitled'}
    </Button>
  )
}

interface FormationListProps {
  formations: Formation[]
  currentId: Id
  onSelect: (id: Id) => void
  onReorder: (id: Id, toIndex: number) => void
}

/**
 * The row of formations. Click one to open it; press and drag to change the
 * order. (Which count each place lands on stays put; see `moveFormation`.)
 */
export function FormationList({ formations, currentId, onSelect, onReorder }: FormationListProps) {
  const sensors = useSensors(
    // A small movement threshold keeps a plain click a click.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // On touch, hold briefly to pick one up, so swiping the row still scrolls it.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const to = formations.findIndex((f) => f.id === over.id)
    if (to !== -1) onReorder(String(active.id), to)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={formations.map((f) => f.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Formations">
          {formations.map((f, i) => (
            <FormationChip
              key={f.id}
              formation={f}
              index={i}
              count={formations.length}
              selected={f.id === currentId}
              onSelect={() => onSelect(f.id)}
              onMove={(to) => onReorder(f.id, to)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
