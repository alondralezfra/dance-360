import { useEffect } from 'react'
import { isTextEntry } from '../../lib/typing'
import { useProject } from '../../store/projectStore'

/**
 * Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z (or Ctrl+Y) redoes the project's last edit.
 * Ignored while typing in a text box, so the browser's own undo of the text keeps working.
 */
export function useUndoShortcuts() {
  const undo = useProject((s) => s.undo)
  const redo = useProject((s) => s.redo)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || isTextEntry(e.target)) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) undo()
      else if ((key === 'z' && e.shiftKey) || key === 'y') redo()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])
}
