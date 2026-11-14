import { SectionHeader } from '../../components/ui/SectionHeader'
import { groupResources } from '../../model/resources'
import { useProject } from '../../store/projectStore'
import { AddLinkForm } from './AddLinkForm'
import { LinkRow } from './LinkRow'

/** The project's links, organised by the section they are about. */
export function LinksSection() {
  const resources = useProject((s) => s.resources)
  const sections = useProject((s) => s.sections)
  const parts = useProject((s) => s.parts)
  const groups = groupResources(resources, sections)

  return (
    <section aria-labelledby="links-heading">
      <SectionHeader id="links-heading" title="Links">
        Tutorial videos, references and documents for this dance, each about the whole dance or one section and
        part. Links open in a new tab. Nothing is fetched from them, so they work offline and nothing is shared.
      </SectionHeader>

      <AddLinkForm />

      {resources.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
          No links yet. Paste a tutorial video, a reference or a Drive document above.
        </p>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <div key={group.section?.id ?? 'whole'}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.section ? group.section.name : 'Whole dance'}
              </h3>
              <ul className="grid grid-cols-1 gap-2">
                {group.items.map((resource) => (
                  <LinkRow
                    key={resource.id}
                    resource={resource}
                    number={resources.indexOf(resource) + 1}
                    sections={sections}
                    parts={parts}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
