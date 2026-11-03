import { useProject } from '../model/store'

const btn =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40'

export function FormationStrip() {
  const formations = useProject((s) => s.formations)
  const currentId = useProject((s) => s.currentFormationId)
  const selectFormation = useProject((s) => s.selectFormation)
  const addFormation = useProject((s) => s.addFormation)
  const removeFormation = useProject((s) => s.removeFormation)
  const renameFormation = useProject((s) => s.renameFormation)

  const index = formations.findIndex((f) => f.id === currentId)
  const current = formations[index]

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={btn}
          onClick={() => selectFormation(formations[index - 1].id)}
          disabled={index <= 0}
          aria-label="Previous formation"
        >
          ◀
        </button>
        <input
          value={current?.name ?? ''}
          onChange={(e) => current && renameFormation(current.id, e.target.value)}
          className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium focus:border-indigo-500 focus:outline-none"
          aria-label="Formation name"
        />
        <button
          className={btn}
          onClick={() => selectFormation(formations[index + 1].id)}
          disabled={index >= formations.length - 1}
          aria-label="Next formation"
        >
          ▶
        </button>
        <span className="text-sm text-slate-500">
          {index + 1} of {formations.length}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            onClick={addFormation}
          >
            + New formation
          </button>
          <button
            className={`${btn} hover:border-red-300 hover:text-red-600`}
            onClick={() => current && removeFormation(current.id)}
            disabled={formations.length <= 1}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {formations.map((f, i) => (
          <button
            key={f.id}
            onClick={() => selectFormation(f.id)}
            className={`shrink-0 rounded-md border px-3 py-2 text-left text-sm ${
              f.id === currentId
                ? 'border-indigo-500 bg-indigo-50 font-medium text-indigo-800'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <span className="mr-1 text-slate-400">{i + 1}.</span>
            {f.name || 'Untitled'}
          </button>
        ))}
      </div>
    </div>
  )
}
