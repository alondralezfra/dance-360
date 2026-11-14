import { LinksSection } from './LinksSection'

/** The Resources tab: links to videos and documents for the dance. (Notes join them in the next slice.) */
export function ResourcesPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 p-4">
        <LinksSection />
      </div>
    </div>
  )
}
