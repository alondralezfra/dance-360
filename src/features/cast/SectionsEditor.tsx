import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Input } from '../../components/ui/Input'
import { NumberField } from '../../components/ui/NumberField'
import { COUNTS_PER_SET, formatCount, toSetAndCount } from '../../model/tempo'
import { useProject } from '../../store/projectStore'

export function SectionsEditor() {
  const sections = useProject((s) => s.sections)
  const addSection = useProject((s) => s.addSection)
  const renameSection = useProject((s) => s.renameSection)
  const setSectionStart = useProject((s) => s.setSectionStart)
  const removeSection = useProject((s) => s.removeSection)

  return (
    <section aria-labelledby="sections-heading">
      <SectionHeader
        id="sections-heading"
        title="Sections"
        actions={
          <Button variant="primary" onClick={addSection}>
            + Add section
          </Button>
        }
      >
        Parts of the song, like Verse 1 or Chorus. Each runs until the next one starts.
      </SectionHeader>

      <ul className="grid grid-cols-1 gap-2">
        {sections.map((section, i) => {
          const at = toSetAndCount(section.startCount)
          return (
            <li
              key={section.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-surface p-2"
            >
              <Input
                value={section.name}
                onChange={(e) => renameSection(section.id, e.target.value)}
                aria-label={`Name of section ${i + 1}`}
                className="min-w-0 flex-1 basis-40"
              />
              {i === 0 ? (
                <span className="text-sm text-muted-foreground">Starts at {formatCount(0)}</span>
              ) : (
                <div role="group" aria-label={`Start of section ${i + 1}`} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="text-sm text-muted-foreground">Starts at</span>
                  <NumberField
                    label="Set"
                    min={1}
                    value={at.set}
                    onCommit={(set) => setSectionStart(section.id, (set - 1) * COUNTS_PER_SET + at.count - 1)}
                  />
                  <NumberField
                    label="Count"
                    min={1}
                    max={COUNTS_PER_SET}
                    value={at.count}
                    onCommit={(count) => setSectionStart(section.id, (at.set - 1) * COUNTS_PER_SET + count - 1)}
                  />
                </div>
              )}
              <IconButton
                variant="danger-ghost"
                icon="close"
                className="ml-auto"
                label={`Remove ${section.name}`}
                title={sections.length <= 1 ? 'There must be at least one section' : 'Remove section'}
                disabled={sections.length <= 1}
                onClick={() => removeSection(section.id)}
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
