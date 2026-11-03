import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { cn } from '../../lib/cn'
import { partIdAt } from '../../model/parts'
import { useCurrentFormation, useProject } from '../../store/projectStore'
import { useUi } from '../../store/uiStore'

export function DancerPanel() {
  const dancers = useProject((s) => s.dancers)
  const parts = useProject((s) => s.parts)
  const sections = useProject((s) => s.sections)
  const assignments = useProject((s) => s.assignments)
  const formation = useCurrentFormation()
  const addDancer = useProject((s) => s.addDancer)
  const renameDancer = useProject((s) => s.renameDancer)
  const removeDancer = useProject((s) => s.removeDancer)
  const selectedDancerId = useUi((s) => s.selectedDancerId)
  const selectDancer = useUi((s) => s.selectDancer)
  const [newName, setNewName] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    addDancer(newName)
    setNewName('')
  }

  return (
    <div className="flex h-full flex-col">
      <h2 className="px-4 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Dancers ({dancers.length})
      </h2>

      <form onSubmit={submit} className="flex gap-2 p-4">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Dancer name"
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="primary" disabled={!newName.trim()}>
          Add
        </Button>
      </form>

      <ul className="flex-1 overflow-y-auto px-2 pb-4">
        {dancers.map((d) => {
          const selected = d.id === selectedDancerId
          // The dot shows the dancer's part at the formation being edited.
          const part = parts.find((p) => p.id === partIdAt(sections, assignments, d.id, formation.count))
          return (
            <li
              key={d.id}
              onClick={() => selectDancer(selected ? null : d.id)}
              className={cn(
                'mb-1 flex items-center gap-2 rounded-md px-2 py-1.5',
                selected ? 'bg-selected-soft' : 'hover:bg-surface-hover',
              )}
            >
              <span
                role="img"
                aria-label={part ? part.name : 'No part'}
                className={cn('h-3 w-3 shrink-0 rounded-full', !part && 'bg-subtle-foreground')}
                style={part ? { backgroundColor: `var(--part-${part.color})` } : undefined}
              />
              <input
                value={d.name}
                onChange={(e) => renameDancer(d.id, e.target.value)}
                onClick={(e) => {
                  e.stopPropagation()
                  selectDancer(d.id)
                }}
                className="min-w-0 flex-1 rounded bg-transparent px-1 py-1 text-sm focus:bg-surface focus:outline focus:outline-ring"
                aria-label="Dancer name"
              />
              <Button
                variant="danger-ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  removeDancer(d.id)
                  if (selected) selectDancer(null)
                }}
                aria-label={`Remove ${d.name}`}
                title="Remove dancer"
              >
                ✕
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
