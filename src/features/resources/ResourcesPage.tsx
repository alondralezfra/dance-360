import { LinksSection } from './LinksSection'
import { NotesSection } from './NotesSection'

/** The Resources tab: links to videos and documents, and notes about the dance. */
export function ResourcesPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 p-4">
        <LinksSection />
        <NotesSection />
      </div>
    </div>
  )
}
