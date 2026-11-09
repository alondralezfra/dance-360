import { AssignmentGrid } from './AssignmentGrid'
import { PartsEditor } from './PartsEditor'
import { SectionsEditor } from './SectionsEditor'

export function CastPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {/* grid-cols-1 (minmax(0, 1fr)) stops a wide child, like the assignment grid, from stretching the whole column */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 p-4">
        <PartsEditor />
        <SectionsEditor />
        <AssignmentGrid />
      </div>
    </div>
  )
}
