import { buttonVariants } from '../../components/ui/buttonVariants'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { cn } from '../../lib/cn'
import { RESOURCE_KINDS, formatStartTime, isResourceKind, normalizeUrl, parseStartTime, resourceHost } from '../../model/resources'
import type { Part, Resource, Section } from '../../model/types'
import { useProject } from '../../store/projectStore'
import { CommittedInput } from './CommittedInput'

interface LinkRowProps {
  resource: Resource
  /** Its place in the whole list, from 1: part of every control's name, so each can be told apart. */
  number: number
  sections: Section[]
  parts: Part[]
}

/** One link: its title, kind, what it is about, a start time and its address, all edited in place. */
export function LinkRow({ resource, number, sections, parts }: LinkRowProps) {
  const updateResource = useProject((s) => s.updateResource)
  const removeResource = useProject((s) => s.removeResource)
  // The address was checked on the way in, but a link opens only if it is still a plain web address.
  const href = normalizeUrl(resource.url) ?? undefined

  // On a phone the title, Open and Remove share the first line and the fields follow (the `order-*` classes); from
  // md up the row simply reads in the order written below.
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2">
      <Input
        variant="inline"
        value={resource.title}
        onChange={(e) => updateResource(resource.id, { title: e.target.value })}
        onBlur={(e) => e.target.value.trim() === '' && updateResource(resource.id, { title: resourceHost(resource.url) })}
        aria-label={`Title of link ${number}`}
        className="order-1 min-w-0 flex-1 basis-40 font-medium md:order-none md:basis-48"
      />
      <Select
        value={resource.kind}
        onChange={(e) => isResourceKind(e.target.value) && updateResource(resource.id, { kind: e.target.value })}
        aria-label={`Kind of link ${number}`}
        className="order-4 md:order-none"
      >
        {RESOURCE_KINDS.map((kind) => (
          <option key={kind.id} value={kind.id}>
            {kind.label}
          </option>
        ))}
      </Select>
      <Select
        value={resource.sectionId ?? ''}
        onChange={(e) => updateResource(resource.id, { sectionId: e.target.value || null })}
        aria-label={`Section of link ${number}`}
        className="order-4 md:order-none"
      >
        <option value="">Whole dance</option>
        {sections.map((section) => (
          <option key={section.id} value={section.id}>
            {section.name}
          </option>
        ))}
      </Select>
      <Select
        value={resource.partId ?? ''}
        onChange={(e) => updateResource(resource.id, { partId: e.target.value || null })}
        aria-label={`Part of link ${number}`}
        className="order-4 md:order-none"
      >
        <option value="">Any part</option>
        {parts.map((part) => (
          <option key={part.id} value={part.id}>
            {part.name}
          </option>
        ))}
      </Select>
      <CommittedInput
        value={resource.startSec === null ? '' : formatStartTime(resource.startSec)}
        parse={(typed) => (typed.trim() === '' ? '' : parseStartTime(typed) === null ? null : formatStartTime(parseStartTime(typed)!))}
        onCommit={(saved) => updateResource(resource.id, { startSec: saved === '' ? null : parseStartTime(saved) })}
        aria-label={`Start time of link ${number}`}
        placeholder="Start 0:00"
        inputMode="numeric"
        className="order-4 w-28 text-center md:order-none"
      />
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${resource.title || 'link'} in a new tab`}
          className={cn(buttonVariants({ variant: 'secondary' }), 'order-2 md:order-none')}
        >
          Open
          <Icon name="externalLink" />
        </a>
      ) : (
        <span className="order-2 text-sm text-danger md:order-none">Not a web link</span>
      )}
      <IconButton
        variant="danger-ghost"
        icon="close"
        label={`Remove ${resource.title || `link ${number}`}`}
        title="Remove link"
        className="order-3 md:order-none"
        onClick={() => removeResource(resource.id)}
      />
      <CommittedInput
        value={resource.url}
        parse={normalizeUrl}
        onCommit={(saved) => updateResource(resource.id, { url: saved })}
        aria-label={`Web address of link ${number}`}
        variant="inline"
        inputMode="url"
        className="order-5 min-w-0 basis-full text-muted-foreground md:order-none"
      />
    </li>
  )
}
