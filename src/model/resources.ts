// Links a director attaches to a project (tutorial videos, references, documents), kept as saved data.
// Pure: no React, no storage. The rules for what counts as a link, how a start time reads, and how links
// are grouped and cleaned up live here so every screen, import and test agrees (decisions/0027).

import type { Id, Project, Resource, ResourceKind, Section } from './types'

/** The kinds of link, in the order they are offered. The label is what the person sees. */
export const RESOURCE_KINDS: { id: ResourceKind; label: string }[] = [
  { id: 'tutorial', label: 'Tutorial video' },
  { id: 'reference', label: 'Reference video' },
  { id: 'rehearsal', label: 'Rehearsal recording' },
  { id: 'document', label: 'Document' },
  { id: 'other', label: 'Other' },
]

export const DEFAULT_RESOURCE_KIND: ResourceKind = 'other'

export const isResourceKind = (value: unknown): value is ResourceKind => RESOURCE_KINDS.some((k) => k.id === value)

export const kindLabel = (kind: ResourceKind) => RESOURCE_KINDS.find((k) => k.id === kind)?.label ?? 'Other'

/** Links longer than this are refused: a real link is a few hundred characters. */
export const MAX_URL_LENGTH = 2000

/**
 * The web address to save for what was typed or pasted, or null if it is not a usable link. Only http and
 * https are accepted (a `javascript:` or `data:` address could run code when opened). A bare address such as
 * "youtube.com/watch?v=abc" gets "https://" added. Surrounding spaces are dropped.
 */
export function normalizeUrl(input: string): string | null {
  const text = input.trim()
  if (text === '' || text.length > MAX_URL_LENGTH || /\s/.test(text)) return null
  // Something that already names a scheme ("ftp:", "javascript:") is judged as written; a bare address is https.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[^/]+:\d+(\/|$)/.test(text)
  const candidate = hasScheme ? text : `https://${text}`
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.hostname === '' || (!url.hostname.includes('.') && url.hostname !== 'localhost')) return null
  return url.href
}

/** The site a link is on, for showing next to a title ("youtube.com"). Empty if it is not a link. */
export function resourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** A start time as people write it: "1:23" or "1:02:03" (h:mm:ss). */
export function formatStartTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const two = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`
}

/**
 * Reads a start time: "83", "1:23" or "1:02:03" (whole seconds, minutes:seconds or h:mm:ss).
 * Returns the seconds, or null if it is empty or not a time. Seconds and minutes after the first part must be under 60.
 */
export function parseStartTime(text: string): number | null {
  const t = text.trim()
  if (!/^\d+(:\d{1,2}){0,2}$/.test(t)) return null
  const parts = t.split(':').map(Number)
  if (parts.slice(1).some((n) => n >= 60)) return null
  const seconds = parts.reduce((total, n) => total * 60 + n, 0)
  return Number.isSafeInteger(seconds) && seconds <= 24 * 3600 ? seconds : null
}

export interface ResourceDraft {
  title: string
  url: string
  kind?: ResourceKind
  sectionId?: Id | null
  partId?: Id | null
  startSec?: number | null
}

/** A new link, or null if the address is not usable. A blank title becomes the site's name. */
export function createResource(id: Id, draft: ResourceDraft): Resource | null {
  const url = normalizeUrl(draft.url)
  if (url === null) return null
  return {
    id,
    title: draft.title.trim() || resourceHost(url),
    url,
    kind: draft.kind ?? DEFAULT_RESOURCE_KIND,
    sectionId: draft.sectionId ?? null,
    partId: draft.partId ?? null,
    startSec: draft.startSec ?? null,
  }
}

export interface ResourceGroup {
  /** The section the links are attached to, or null for links about the whole dance. */
  section: Section | null
  items: Resource[]
}

/**
 * The links organised by section: the whole-dance ones first, then each section in song order, links in the
 * order they were added. A link attached to a section that no longer exists counts as whole-dance.
 */
export function groupResources(resources: Resource[], sections: Section[]): ResourceGroup[] {
  const known = new Set(sections.map((s) => s.id))
  const whole = resources.filter((r) => r.sectionId === null || !known.has(r.sectionId))
  const groups: ResourceGroup[] = whole.length ? [{ section: null, items: whole }] : []
  for (const section of sections) {
    const items = resources.filter((r) => r.sectionId === section.id)
    if (items.length) groups.push({ section, items })
  }
  return groups
}

/** The links with a section forgotten (when that section is removed): they stay, as whole-dance links. */
export const withoutSection = (resources: Resource[], sectionId: Id): Resource[] =>
  resources.map((r) => (r.sectionId === sectionId ? { ...r, sectionId: null } : r))

/** The links with a part forgotten (when that part is removed): they stay, attached to no part. */
export const withoutPart = (resources: Resource[], partId: Id): Resource[] =>
  resources.map((r) => (r.partId === partId ? { ...r, partId: null } : r))

/** What is wrong with a project's links, worded for a log, or null if they are fine (used when reading a backup file). */
export function problemWithResources(project: Pick<Project, 'resources' | 'sections' | 'parts'>): string | null {
  const { resources } = project
  if (!Array.isArray(resources)) return 'the links are missing'
  const sectionIds = new Set(project.sections.map((s) => s.id))
  const partIds = new Set(project.parts.map((p) => p.id))
  const seen = new Set<string>()
  for (const r of resources as unknown[]) {
    const x = r as Partial<Resource> | null
    if (typeof x !== 'object' || x === null) return 'a link is not an object'
    if (typeof x.id !== 'string' || x.id === '' || seen.has(x.id)) return 'a link has no id or a repeated one'
    seen.add(x.id)
    if (typeof x.title !== 'string') return 'a link has no title'
    if (typeof x.url !== 'string' || normalizeUrl(x.url) !== x.url) return 'a link is not a web address'
    if (!isResourceKind(x.kind)) return 'a link has an unknown kind'
    if (x.sectionId !== null && (typeof x.sectionId !== 'string' || !sectionIds.has(x.sectionId))) return 'a link names a section that does not exist'
    if (x.partId !== null && (typeof x.partId !== 'string' || !partIds.has(x.partId))) return 'a link names a part that does not exist'
    if (x.startSec !== null && (typeof x.startSec !== 'number' || !Number.isFinite(x.startSec) || x.startSec < 0)) return 'a link has a bad start time'
  }
  return null
}
