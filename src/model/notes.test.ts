import { describe, expect, it } from 'vitest'
import {
  DANCE_ANCHOR,
  MAX_NOTE_COUNT,
  MAX_NOTE_LENGTH,
  anchorLabel,
  anchorSection,
  createNote,
  groupNotes,
  isValidAnchor,
  notesWithoutPart,
  notesWithoutSection,
  problemWithNotes,
} from './notes'
import { createEmptyProject } from './project'
import type { Note, NoteAnchor, Section } from './types'

const sections: Section[] = [
  { id: 's1', name: 'Verse', startCount: 0 },
  { id: 's2', name: 'Chorus', startCount: 16 },
]
const note = (id: string, anchor: NoteAnchor = DANCE_ANCHOR, partId: string | null = null): Note => ({ id, text: `note ${id}`, anchor, partId })

describe('isValidAnchor', () => {
  it('accepts the whole dance, an existing section, and a whole count in range', () => {
    expect(isValidAnchor({ kind: 'dance' }, sections)).toBe(true)
    expect(isValidAnchor({ kind: 'section', sectionId: 's2' }, sections)).toBe(true)
    expect(isValidAnchor({ kind: 'count', count: 0 }, sections)).toBe(true)
    expect(isValidAnchor({ kind: 'count', count: MAX_NOTE_COUNT }, sections)).toBe(true)
  })

  it('refuses a missing section, and counts that are not whole, negative or out of range', () => {
    expect(isValidAnchor({ kind: 'section', sectionId: 'nope' }, sections)).toBe(false)
    expect(isValidAnchor({ kind: 'section' }, sections)).toBe(false)
    for (const count of [-1, 1.5, Number.NaN, Infinity, MAX_NOTE_COUNT + 1, '5']) expect(isValidAnchor({ kind: 'count', count }, sections), String(count)).toBe(false)
  })

  it('refuses anything that is not an anchor, or has extra claims', () => {
    for (const bad of [null, undefined, 5, 'dance', [], {}, { kind: 'galaxy' }, { kind: 'dance', count: 4 }]) expect(isValidAnchor(bad, sections), JSON.stringify(bad)).toBe(false)
  })
})

describe('where a note belongs', () => {
  it('a section note belongs to its section; a count note to the section the count falls in; a whole-dance note to none', () => {
    expect(anchorSection({ kind: 'section', sectionId: 's2' }, sections)?.name).toBe('Chorus')
    expect(anchorSection({ kind: 'count', count: 3 }, sections)?.name).toBe('Verse')
    expect(anchorSection({ kind: 'count', count: 16 }, sections)?.name).toBe('Chorus')
    expect(anchorSection({ kind: 'count', count: 500 }, sections)?.name).toBe('Chorus')
    expect(anchorSection(DANCE_ANCHOR, sections)).toBeNull()
  })

  it('a note about a section that is gone counts as whole-dance', () => {
    expect(anchorSection({ kind: 'section', sectionId: 'gone' }, sections)).toBeNull()
    expect(anchorLabel({ kind: 'section', sectionId: 'gone' }, sections)).toBe('Whole dance')
  })

  it('says what a note is about in words', () => {
    expect(anchorLabel(DANCE_ANCHOR, sections)).toBe('Whole dance')
    expect(anchorLabel({ kind: 'section', sectionId: 's1' }, sections)).toBe('Verse')
    expect(anchorLabel({ kind: 'count', count: 10 }, sections)).toBe('Set 2 · Count 3')
  })
})

describe('createNote', () => {
  it('trims the text and defaults to the whole dance and any part', () => {
    expect(createNote('x', { text: '  Arms up on 5-6  ' })).toEqual({ id: 'x', text: 'Arms up on 5-6', anchor: DANCE_ANCHOR, partId: null })
  })

  it('keeps the anchor and part it is given', () => {
    expect(createNote('x', { text: 'hi', anchor: { kind: 'count', count: 4 }, partId: 'p' })).toMatchObject({ anchor: { kind: 'count', count: 4 }, partId: 'p' })
  })

  it('makes nothing from empty or blank text, and cuts text that is too long', () => {
    expect(createNote('x', { text: '' })).toBeNull()
    expect(createNote('x', { text: ' \n\t ' })).toBeNull()
    expect(createNote('x', { text: 'a'.repeat(MAX_NOTE_LENGTH + 50) })!.text).toHaveLength(MAX_NOTE_LENGTH)
  })

  it('keeps line breaks inside the text', () => {
    expect(createNote('x', { text: 'line one\nline two' })!.text).toBe('line one\nline two')
  })
})

describe('groupNotes', () => {
  it('puts whole-dance notes first, then each section in song order, leaving out empty groups', () => {
    const groups = groupNotes(
      [note('a', { kind: 'section', sectionId: 's2' }), note('b'), note('c', { kind: 'count', count: 3 })],
      sections,
    )
    expect(groups.map((g) => [g.section?.name ?? null, g.items.map((n) => n.id)])).toEqual([
      [null, ['b']],
      ['Verse', ['c']],
      ['Chorus', ['a']],
    ])
    expect(groupNotes([], sections)).toEqual([])
  })

  it('inside a group: the section’s own notes first, then notes at counts, earliest first, ties in the order added', () => {
    const groups = groupNotes(
      [
        note('late', { kind: 'count', count: 30 }),
        note('own', { kind: 'section', sectionId: 's2' }),
        note('early', { kind: 'count', count: 17 }),
        note('tie1', { kind: 'count', count: 20 }),
        note('own2', { kind: 'section', sectionId: 's2' }),
        note('tie2', { kind: 'count', count: 20 }),
      ],
      sections,
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].items.map((n) => n.id)).toEqual(['own', 'own2', 'early', 'tie1', 'tie2', 'late'])
  })

  it('files a note at a count under the section that count falls in, and a note about a vanished section under Whole dance', () => {
    const groups = groupNotes([note('a', { kind: 'count', count: 16 }), note('b', { kind: 'section', sectionId: 'gone' })], sections)
    expect(groups.map((g) => [g.section?.name ?? null, g.items.map((n) => n.id)])).toEqual([
      [null, ['b']],
      ['Chorus', ['a']],
    ])
  })

  it('does not change the list it is given', () => {
    const notes = [note('a', { kind: 'count', count: 9 }), note('b', { kind: 'count', count: 2 })]
    const copy = structuredClone(notes)
    groupNotes(notes, sections)
    expect(notes).toEqual(copy)
  })
})

describe('forgetting a removed section or part', () => {
  it('turns notes about a removed section into whole-dance notes, and leaves count notes and other sections alone', () => {
    const out = notesWithoutSection(
      [note('a', { kind: 'section', sectionId: 's1' }, 'p'), note('b', { kind: 'section', sectionId: 's2' }), note('c', { kind: 'count', count: 3 })],
      's1',
    )
    expect(out.map((n) => [n.id, n.anchor.kind, n.partId])).toEqual([
      ['a', 'dance', 'p'],
      ['b', 'section', null],
      ['c', 'count', null],
    ])
  })

  it('turns notes about a removed part into notes about any part', () => {
    const out = notesWithoutPart([note('a', DANCE_ANCHOR, 'p1'), note('b', DANCE_ANCHOR, 'p2')], 'p1')
    expect(out.map((n) => n.partId)).toEqual([null, 'p2'])
  })
})

describe('problemWithNotes', () => {
  const project = createEmptyProject()
  const sectionId = project.sections[0].id
  const partId = project.parts[0].id
  const check = (notes: unknown) => problemWithNotes({ ...project, notes: notes as Note[] })

  it('accepts none, and well-formed notes about things that exist', () => {
    expect(check([])).toBeNull()
    expect(check([note('a', { kind: 'section', sectionId }, partId), note('b', { kind: 'count', count: 12 }), note('c')])).toBeNull()
  })

  it('names what is wrong', () => {
    expect(check(undefined)).toMatch(/missing/)
    expect(check([null])).toMatch(/not an object/)
    expect(check([note('')])).toMatch(/no id/)
    expect(check([note('a'), note('a')])).toMatch(/repeated/)
    expect(check([{ ...note('a'), text: 5 }])).toMatch(/text/)
    expect(check([{ ...note('a'), text: 'x'.repeat(MAX_NOTE_LENGTH + 1) }])).toMatch(/too much/)
    expect(check([note('a', { kind: 'section', sectionId: 'nope' })])).toMatch(/does not exist/)
    expect(check([note('a', { kind: 'count', count: -4 })])).toMatch(/does not exist/)
    expect(check([{ ...note('a'), anchor: 'dance' }])).toMatch(/does not exist/)
    expect(check([note('a', DANCE_ANCHOR, 'nope')])).toMatch(/part that does not exist/)
  })

  it('allows an empty note (someone cleared the text while editing)', () => {
    expect(check([{ ...note('a'), text: '' }])).toBeNull()
  })
})
