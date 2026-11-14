import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../model/project'
import { selectDocument } from './storeTypes'
import { useProject } from './projectStore'

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), status: 'ready', projectId: 'test' })
})

const s = () => useProject.getState()
const firstSection = () => s().sections[0].id
const firstPart = () => s().parts[0].id

describe('adding links', () => {
  it('starts with none, and a new project has none', () => {
    expect(s().resources).toEqual([])
    expect(createEmptyProject().resources).toEqual([])
  })

  it('adds a link in standard form with its defaults, and returns its id', () => {
    const id = s().addResource({ title: 'Chorus tutorial', url: 'www.youtube.com/watch?v=abc' })
    expect(id).not.toBeNull()
    expect(s().resources).toEqual([
      { id, title: 'Chorus tutorial', url: 'https://www.youtube.com/watch?v=abc', kind: 'other', sectionId: null, partId: null, startSec: null },
    ])
  })

  it('keeps links in the order they were added', () => {
    s().addResource({ title: 'one', url: 'https://a.com' })
    s().addResource({ title: 'two', url: 'https://b.com' })
    expect(s().resources.map((r) => r.title)).toEqual(['one', 'two'])
  })

  it('refuses an address that is not a web link, adding nothing', () => {
    expect(s().addResource({ title: 'Bad', url: 'javascript:alert(1)' })).toBeNull()
    expect(s().addResource({ title: 'Bad', url: 'not a link' })).toBeNull()
    expect(s().resources).toEqual([])
  })
})

describe('changing links', () => {
  const add = () => s().addResource({ title: 'Tutorial', url: 'https://a.com', kind: 'tutorial' })!
  const get = (id: string) => s().resources.find((r) => r.id === id)!

  it('changes the title, kind, section, part and start time, and clears them with null', () => {
    const id = add()
    s().updateResource(id, { title: 'Hips', kind: 'reference', sectionId: firstSection(), partId: firstPart(), startSec: 90 })
    expect(get(id)).toMatchObject({ title: 'Hips', kind: 'reference', sectionId: firstSection(), partId: firstPart(), startSec: 90 })
    s().updateResource(id, { sectionId: null, partId: null, startSec: null })
    expect(get(id)).toMatchObject({ sectionId: null, partId: null, startSec: null })
  })

  it('stores a changed address in standard form, and ignores one that is not a web link', () => {
    const id = add()
    s().updateResource(id, { url: 'b.com/page' })
    expect(get(id).url).toBe('https://b.com/page')
    s().updateResource(id, { url: 'javascript:alert(1)' })
    s().updateResource(id, { url: '   ' })
    expect(get(id).url).toBe('https://b.com/page')
  })

  it('ignores a section or part that does not exist, but still applies the other changes', () => {
    const id = add()
    s().updateResource(id, { sectionId: 'nope', partId: 'nope', title: 'Renamed' })
    expect(get(id)).toMatchObject({ title: 'Renamed', sectionId: null, partId: null })
  })

  it('cannot change a link\'s id, and leaves other links and an unknown id alone', () => {
    const a = add()
    const b = s().addResource({ title: 'B', url: 'https://b.com' })!
    s().updateResource(a, { id: 'hijack', title: 'A2' } as never)
    s().updateResource('missing', { title: 'x' })
    expect(s().resources.map((r) => [r.id, r.title])).toEqual([
      [a, 'A2'],
      [b, 'B'],
    ])
  })
})

describe('removing links', () => {
  it('removes just that link, and does nothing for an unknown id', () => {
    const a = s().addResource({ title: 'A', url: 'https://a.com' })!
    const b = s().addResource({ title: 'B', url: 'https://b.com' })!
    s().removeResource(a)
    s().removeResource('missing')
    expect(s().resources.map((r) => r.id)).toEqual([b])
  })
})

describe('removing the thing a link is about', () => {
  it('keeps links to a removed section, as whole-dance links', () => {
    const second = s().addSection()
    const id = s().addResource({ title: 'Chorus', url: 'https://a.com', sectionId: second, partId: firstPart() })!
    s().removeSection(second)
    expect(s().resources).toHaveLength(1)
    expect(s().resources.find((r) => r.id === id)).toMatchObject({ sectionId: null, partId: firstPart() })
  })

  it('keeps links to a removed part, attached to no part', () => {
    const extra = s().addPart()!
    const id = s().addResource({ title: 'Floor work', url: 'https://a.com', partId: extra, sectionId: firstSection() })!
    s().removePart(extra)
    expect(s().resources.find((r) => r.id === id)).toMatchObject({ partId: null, sectionId: firstSection() })
  })

  it('leaves links about other sections and parts alone', () => {
    const second = s().addSection()
    const keep = s().addResource({ title: 'Keep', url: 'https://a.com', sectionId: firstSection() })!
    s().addResource({ title: 'Go', url: 'https://b.com', sectionId: second })
    s().removeSection(second)
    expect(s().resources.find((r) => r.id === keep)!.sectionId).toBe(firstSection())
  })
})

describe('links are part of the saved project', () => {
  it('appear in the document that is saved and in what undo restores', () => {
    s().addResource({ title: 'A', url: 'https://a.com' })
    expect(selectDocument(s()).resources).toHaveLength(1)
  })
})
