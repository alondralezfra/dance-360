import { IconButton } from '../../components/ui/IconButton'
import { cn } from '../../lib/cn'
import { canRedo, canUndo } from '../../model/history'
import { useProject } from '../../store/projectStore'

/** Undo / Redo for the open project (also Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z, see useUndoShortcuts). */
export function UndoRedoButtons({ className }: { className?: string }) {
  const undoable = useProject((s) => canUndo(s.history))
  const redoable = useProject((s) => canRedo(s.history))
  const undo = useProject((s) => s.undo)
  const redo = useProject((s) => s.redo)
  return (
    <div className={cn('flex items-center', className)}>
      <IconButton variant="ghost" icon="undo" label="Undo" disabled={!undoable} onClick={undo} />
      <IconButton variant="ghost" icon="redo" label="Redo" disabled={!redoable} onClick={redo} />
    </div>
  )
}
