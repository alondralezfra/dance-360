import { useState } from 'react'
import { useProject } from '../model/store'

export function DancerPanel() {
  const dancers = useProject((s) => s.dancers)
  const selectedDancerId = useProject((s) => s.selectedDancerId)
  const addDancer = useProject((s) => s.addDancer)
  const renameDancer = useProject((s) => s.renameDancer)
  const removeDancer = useProject((s) => s.removeDancer)
  const selectDancer = useProject((s) => s.selectDancer)
  const [newName, setNewName] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    addDancer(newName)
    setNewName('')
  }

  return (
    <div className="flex h-full flex-col">
      <h2 className="px-4 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Dancers ({dancers.length})
      </h2>

      <form onSubmit={submit} className="flex gap-2 p-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Dancer name"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          disabled={!newName.trim()}
        >
          Add
        </button>
      </form>

      <ul className="flex-1 overflow-y-auto px-2 pb-4">
        {dancers.map((d) => {
          const selected = d.id === selectedDancerId
          return (
            <li
              key={d.id}
              onClick={() => selectDancer(selected ? null : d.id)}
              className={`group mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 ${
                selected ? 'bg-amber-100' : 'hover:bg-slate-100'
              }`}
            >
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${
                  selected ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
              />
              <input
                value={d.name}
                onChange={(e) => renameDancer(d.id, e.target.value)}
                onClick={(e) => {
                  e.stopPropagation()
                  selectDancer(d.id)
                }}
                className="min-w-0 flex-1 rounded bg-transparent px-1 py-1 text-sm focus:bg-white focus:outline focus:outline-indigo-400"
                aria-label="Dancer name"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeDancer(d.id)
                }}
                className="rounded px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Remove ${d.name}`}
                title="Remove dancer"
              >
                ✕
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
