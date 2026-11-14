import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_NOTE_LENGTH } from '../model/notes'
import { createEmptyProject } from '../model/project'
import { useProject } from './projectStore'
import { selectDocument } from './storeTypes'

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
})

const s = () => useProject.getState()
const firstSection = () => s().sections[0].id
const firstPart = () => s().parts[0].id
const get = (id: string) => s().notes.find((n) => n.id === id)!

describe('adding notes', () => {
  it('starts with none, and a new project has none', () => {
    expect(s().notes).toEqual([])
    expect(createEmptyProject().notes).toEqual([])
  })

  it('adds a trimmed note about the whole dance and any part, and returns its id', () => {
    const id = s().addNote({ text: '  Arms up on 5-6  ' })
    expect(id).not.toBeNull()
    expect(s().notes).toEqual([{ id, text: 'Arms up on 5-6', anchor: { kind: 'dance' }, partId: null }])
  })

  it('adds notes about a section, a count and a part, in the order added', () => {
    const a = s().addNote({ text: 'section', anchor: { kind: 'section', sectionId: firstSection() } })
    const b = s().addNote({ text: 'count', anchor: { kind: 'count', count: 12 }, partId: firstPart() })!
    expect(s().notes.map((n) => n.id)).toEqual([a, b])
    expect(get(b)).toMatchObject({ anchor: { kind: 'count', count: 12 }, partId: firstPart() })
  })

  it('adds nothing for empty text, or for an anchor or part that does not exist', () => {
    expect(s().addNote({ text: '   ' })).toBeNull()
    expect(s().addNote({ text: 'x', anchor: { kind: 'section', sectionId: 'nope' } })).toBeNull()
    expect(s().addNote({ text: 'x', anchor: { kind: 'count', count: -3 } })).toBeNull()
    expect(s().addNote({ text: 'x', anchor: { kind: 'count', count: 2.5 } })).toBeNull()
    expect(s().addNote({ text: 'x', partId: 'nope' })).toBeNull()
    expect(s().notes).toEqual([])
  })

  it('cuts text that is too long', () => {
    const id = s().addNote({ text: 'a'.repeat(MAX_NOTE_LENGTH + 10) })!
    expect(get(id).text).toHaveLength(MAX_NOTE_LENGTH)
  })
})

describe('changing notes', () => {
  const add = () => s().addNote({ text: 'Arms up' })!

  it('changes the text, the anchor and the part, and clears the part with null', () => {
    const id = add()
    s().updateNote(id, { text: 'Arms up on 5-6', anchor: { kind: 'count', count: 4 }, partId: firstPart() })
    expect(get(id)).toMatchObject({ text: 'Arms up on 5-6', anchor: { kind: 'count', count: 4 }, partId: firstPart() })
    s().updateNote(id, { anchor: { kind: 'dance' }, partId: null })
    expect(get(id)).toMatchObject({ anchor: { kind: 'dance' }, partId: null })
  })

  it('lets the text be emptied while editing, and cuts it to the limit', () => {
    const id = add()
    s().updateNote(id, { text: '' })
    expect(get(id).text).toBe('')
    s().updateNote(id, { text: 'b'.repeat(MAX_NOTE_LENGTH + 5) })
    expect(get(id).text).toHaveLength(MAX_NOTE_LENGTH)
  })

  it('ignores an anchor or part that does not exist, but still applies the rest', () => {
    const id = add()
    s().updateNote(id, { anchor: { kind: 'section', sectionId: 'nope' }, partId: 'nope', text: 'Renamed' })
    expect(get(id)).toMatchObject({ text: 'Renamed', anchor: { kind: 'dance' }, partId: null })
    s().updateNote(id, { anchor: { kind: 'count', count: -1 } })
    expect(get(id).anchor).toEqual({ kind: 'dance' })
  })

  it('cannot change a note’s id, and leaves other notes and an unknown id alone', () => {
    const a = add()
    const b = s().addNote({ text: 'B' })!
    s().updateNote(a, { id: 'hijack', text: 'A2' } as never)
    s().updateNote('missing', { text: 'x' })
    expect(s().notes.map((n) => [n.id, n.text])).toEqual([
      [a, 'A2'],
      [b, 'B'],
    ])
  })
})

describe('removing notes', () => {
  it('removes just that note, and does nothing for an unknown id', () => {
    const a = s().addNote({ text: 'A' })!
    const b = s().addNote({ text: 'B' })!
    s().removeNote(a)
    s().removeNote('missing')
    expect(s().notes.map((n) => n.id)).toEqual([b])
  })
})

describe('removing the thing a note is about', () => {
  it('keeps a note about a removed section, as a whole-dance note, and its part', () => {
    const second = s().addSection()
    const id = s().addNote({ text: 'Chorus', anchor: { kind: 'section', sectionId: second }, partId: firstPart() })!
    s().removeSection(second)
    expect(s().notes).toHaveLength(1)
    expect(get(id)).toMatchObject({ anchor: { kind: 'dance' }, partId: firstPart() })
  })

  it('keeps a note at a count when its section is removed: the count now falls in the section that stretched over it', () => {
    const second = s().addSection() // starts at count 16
    const id = s().addNote({ text: 'Arms', anchor: { kind: 'count', count: 20 } })!
    s().removeSection(second)
    expect(get(id).anchor).toEqual({ kind: 'count', count: 20 })
  })

  it('keeps a note about a removed part, about any part', () => {
    const extra = s().addPart()!
    const id = s().addNote({ text: 'Floor work', partId: extra, anchor: { kind: 'section', sectionId: firstSection() } })!
    s().removePart(extra)
    expect(get(id)).toMatchObject({ partId: null, anchor: { kind: 'section', sectionId: firstSection() } })
  })

  it('leaves notes about other sections and parts alone', () => {
    const second = s().addSection()
    const keep = s().addNote({ text: 'Keep', anchor: { kind: 'section', sectionId: firstSection() } })!
    s().addNote({ text: 'Go', anchor: { kind: 'section', sectionId: second } })
    s().removeSection(second)
    expect(get(keep).anchor).toEqual({ kind: 'section', sectionId: firstSection() })
  })
})

describe('notes are part of the saved project', () => {
  it('appear in the document that is saved', () => {
    s().addNote({ text: 'A' })
    expect(selectDocument(s()).notes).toHaveLength(1)
  })
})
