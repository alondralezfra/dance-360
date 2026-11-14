// Notes a director attaches to a project ("arms up on 5-6"), kept as saved data. Pure: no React, no storage.
// Each note is about one thing (the whole dance, a section, or one whole count) and optionally one part.
// The rules for what a note may be about, how notes are grouped, and what happens when a section or part
// they name is removed live here so every screen, import and test agrees (decisions/0028).

import { sectionIndexAt } from './parts'
import { formatCount } from './tempo'
import type { Id, Note, NoteAnchor, Project, Section } from './types'

/** Notes longer than this are cut: a note is a few lines, not a document. */
export const MAX_NOTE_LENGTH = 5000
/** The furthest count a note can be anchored to (a dance is a few hundred counts at most). */
export const MAX_NOTE_COUNT = 100_000

export const DANCE_ANCHOR: NoteAnchor = { kind: 'dance' }

/** True if the anchor can be saved with these sections: a section must exist, a count must be a whole count in range. */
export function isValidAnchor(anchor: unknown, sections: Pick<Section, 'id'>[]): anchor is NoteAnchor {
  if (typeof anchor !== 'object' || anchor === null) return false
  const a = anchor as Record<string, unknown>
  if (a.kind === 'dance') return Object.keys(a).length === 1
  if (a.kind === 'section') return typeof a.sectionId === 'string' && sections.some((s) => s.id === a.sectionId)
  if (a.kind === 'count') return typeof a.count === 'number' && Number.isInteger(a.count) && a.count >= 0 && a.count <= MAX_NOTE_COUNT
  return false
}

/** The section a note belongs to for display: its own, or the one its count falls in. Null for the whole dance. */
export function anchorSection(anchor: NoteAnchor, sections: Section[]): Section | null {
  if (anchor.kind === 'section') return sections.find((s) => s.id === anchor.sectionId) ?? null
  if (anchor.kind === 'count') return sections[sectionIndexAt(sections, anchor.count)] ?? null
  return null
}

/** What a note is about, in words: "Whole dance", the section's name, or "Set 2 · Count 3". */
export function anchorLabel(anchor: NoteAnchor, sections: Section[]): string {
  if (anchor.kind === 'count') return formatCount(anchor.count)
  if (anchor.kind === 'section') return anchorSection(anchor, sections)?.name ?? 'Whole dance'
  return 'Whole dance'
}

export interface NoteDraft {
  text: string
  anchor?: NoteAnchor
  partId?: Id | null
}

/** A new note, or null if there is no text. The text is trimmed and cut to `MAX_NOTE_LENGTH`. */
export function createNote(id: Id, draft: NoteDraft): Note | null {
  const text = draft.text.trim().slice(0, MAX_NOTE_LENGTH)
  if (text === '') return null
  return { id, text, anchor: draft.anchor ?? DANCE_ANCHOR, partId: draft.partId ?? null }
}

export interface NoteGroup {
  /** The section the notes are about (or that their counts fall in), or null for notes about the whole dance. */
  section: Section | null
  items: Note[]
}

/**
 * The notes organised by section: whole-dance notes first, then each section in song order. Inside a group the
 * notes about the section itself come first, then the ones at counts, earliest count first; ties keep the order added.
 */
export function groupNotes(notes: Note[], sections: Section[]): NoteGroup[] {
  const order = (n: Note) => (n.anchor.kind === 'count' ? n.anchor.count : -1)
  const sorted = (items: Note[]) => items.map((n, i) => ({ n, i })).sort((a, b) => order(a.n) - order(b.n) || a.i - b.i).map((x) => x.n)
  const groups: NoteGroup[] = []
  const whole = notes.filter((n) => anchorSection(n.anchor, sections) === null)
  if (whole.length) groups.push({ section: null, items: sorted(whole) })
  for (const section of sections) {
    const items = notes.filter((n) => anchorSection(n.anchor, sections)?.id === section.id)
    if (items.length) groups.push({ section, items: sorted(items) })
  }
  return groups
}

/** The notes with a removed section forgotten: notes about it stay, as whole-dance notes. (A note at a count needs no change: the count falls in the section that stretched over it.) */
export const notesWithoutSection = (notes: Note[], sectionId: Id): Note[] =>
  notes.map((n) => (n.anchor.kind === 'section' && n.anchor.sectionId === sectionId ? { ...n, anchor: DANCE_ANCHOR } : n))

/** The notes with a removed part forgotten: they stay, about any part. */
export const notesWithoutPart = (notes: Note[], partId: Id): Note[] => notes.map((n) => (n.partId === partId ? { ...n, partId: null } : n))

/** What is wrong with a project's notes, worded for a log, or null if they are fine (used when reading a backup file). */
export function problemWithNotes(project: Pick<Project, 'notes' | 'sections' | 'parts'>): string | null {
  const { notes } = project
  if (!Array.isArray(notes)) return 'the notes are missing'
  const partIds = new Set(project.parts.map((p) => p.id))
  const seen = new Set<string>()
  for (const raw of notes as unknown[]) {
    const n = raw as Partial<Note> | null
    if (typeof n !== 'object' || n === null) return 'a note is not an object'
    if (typeof n.id !== 'string' || n.id === '' || seen.has(n.id)) return 'a note has no id or a repeated one'
    seen.add(n.id)
    if (typeof n.text !== 'string' || n.text.length > MAX_NOTE_LENGTH) return 'a note has no text or too much'
    if (!isValidAnchor(n.anchor, project.sections)) return 'a note is about something that does not exist'
    if (n.partId !== null && (typeof n.partId !== 'string' || !partIds.has(n.partId))) return 'a note names a part that does not exist'
  }
  return null
}
