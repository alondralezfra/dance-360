import { Button } from '../../components/ui/Button'
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
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <h2 id="sections-heading" className="text-lg font-semibold">
            Sections
          </h2>
          <p className="text-sm text-muted-foreground">
            Parts of the song, like Verse 1 or Chorus. Each runs until the next one starts.
          </p>
        </div>
        <Button variant="primary" onClick={addSection}>
          + Add section
        </Button>
      </div>

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
              <Button
                variant="danger-ghost"
                size="icon"
                className="ml-auto"
                onClick={() => removeSection(section.id)}
                disabled={sections.length <= 1}
                aria-label={`Remove ${section.name}`}
                title={sections.length <= 1 ? 'There must be at least one section' : 'Remove section'}
              >
                ✕
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
