import { describe, expect, it } from 'vitest'
import { createEmptyProject } from './project'
import {
  RESOURCE_KINDS,
  createResource,
  formatStartTime,
  groupResources,
  kindLabel,
  normalizeUrl,
  parseStartTime,
  problemWithResources,
  resourceHost,
  withoutPart,
  withoutSection,
} from './resources'
import type { Resource, Section } from './types'

const link = (over: Partial<Resource> = {}): Resource => ({
  id: 'r1',
  title: 'Chorus tutorial',
  url: 'https://www.youtube.com/watch?v=abc',
  kind: 'tutorial',
  sectionId: null,
  partId: null,
  startSec: null,
  ...over,
})

describe('normalizeUrl', () => {
  it('keeps http and https links, trimmed and in standard form', () => {
    expect(normalizeUrl('  https://www.youtube.com/watch?v=abc  ')).toBe('https://www.youtube.com/watch?v=abc')
    expect(normalizeUrl('http://example.com')).toBe('http://example.com/')
  })

  it('adds https:// to a bare address', () => {
    expect(normalizeUrl('youtube.com/watch?v=abc')).toBe('https://youtube.com/watch?v=abc')
    expect(normalizeUrl('drive.google.com/file/d/1/view')).toBe('https://drive.google.com/file/d/1/view')
    expect(normalizeUrl('localhost:3000/page')).toBe('https://localhost:3000/page')
  })

  it('refuses addresses that could run code or open something else', () => {
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<b>x</b>', 'file:///C:/secret.txt', 'ftp://example.com/a', 'mailto:a@b.com', 'vbscript:x']) {
      expect(normalizeUrl(bad), bad).toBeNull()
    }
  })

  it('refuses things that are not a web address at all', () => {
    for (const bad of ['', '   ', 'not a link', 'hello', 'https://', 'http:// spaced.com', 'https://nodot']) {
      expect(normalizeUrl(bad), bad).toBeNull()
    }
  })

  it('refuses an absurdly long address', () => {
    expect(normalizeUrl(`https://example.com/${'a'.repeat(2000)}`)).toBeNull()
  })
})

describe('resourceHost', () => {
  it('names the site without "www."', () => {
    expect(resourceHost('https://www.youtube.com/watch?v=abc')).toBe('youtube.com')
    expect(resourceHost('https://drive.google.com/x')).toBe('drive.google.com')
  })

  it('is empty for something that is not an address', () => {
    expect(resourceHost('nonsense')).toBe('')
  })
})

describe('start times', () => {
  it('formats seconds as minutes:seconds, with hours when needed', () => {
    expect(formatStartTime(0)).toBe('0:00')
    expect(formatStartTime(83)).toBe('1:23')
    expect(formatStartTime(3723)).toBe('1:02:03')
    expect(formatStartTime(-5)).toBe('0:00')
    expect(formatStartTime(59.6)).toBe('1:00')
  })

  it('reads seconds, minutes:seconds and hours:minutes:seconds', () => {
    expect(parseStartTime('83')).toBe(83)
    expect(parseStartTime(' 1:23 ')).toBe(83)
    expect(parseStartTime('1:02:03')).toBe(3723)
    expect(parseStartTime('0:05')).toBe(5)
  })

  it('reads back what it formats', () => {
    for (const s of [0, 7, 83, 600, 3723, 7200]) expect(parseStartTime(formatStartTime(s))).toBe(s)
  })

  it('refuses what is not a time', () => {
    for (const bad of ['', ' ', 'abc', '1:99', '1:2:99', '-5', '1.5', '1:', ':30', '1:2:3:4', '99999999']) {
      expect(parseStartTime(bad), bad).toBeNull()
    }
  })
})

describe('createResource', () => {
  it('builds a link with its defaults, and the site as the title when none is given', () => {
    expect(createResource('x', { title: '  ', url: 'www.youtube.com/watch?v=abc' })).toEqual({
      id: 'x',
      title: 'youtube.com',
      url: 'https://www.youtube.com/watch?v=abc',
      kind: 'other',
      sectionId: null,
      partId: null,
      startSec: null,
    })
  })

  it('keeps what was chosen', () => {
    const r = createResource('x', { title: ' Hips ', url: 'https://a.com', kind: 'reference', sectionId: 's', partId: 'p', startSec: 12 })
    expect(r).toMatchObject({ title: 'Hips', kind: 'reference', sectionId: 's', partId: 'p', startSec: 12 })
  })

  it('returns nothing for an unusable address', () => {
    expect(createResource('x', { title: 'Bad', url: 'javascript:alert(1)' })).toBeNull()
  })
})

describe('kinds', () => {
  it('has a label for every kind, and falls back to Other for an unknown one', () => {
    expect(RESOURCE_KINDS.map((k) => k.id)).toEqual(['tutorial', 'reference', 'rehearsal', 'document', 'other'])
    expect(kindLabel('rehearsal')).toBe('Rehearsal recording')
    expect(kindLabel('bogus' as never)).toBe('Other')
  })
})

describe('groupResources', () => {
  const sections: Section[] = [
    { id: 's1', name: 'Verse', startCount: 0 },
    { id: 's2', name: 'Chorus', startCount: 16 },
  ]

  it('puts whole-dance links first, then each section in song order, keeping the order added', () => {
    const groups = groupResources(
      [link({ id: 'a', sectionId: 's2' }), link({ id: 'b' }), link({ id: 'c', sectionId: 's1' }), link({ id: 'd', sectionId: 's2' })],
      sections,
    )
    expect(groups.map((g) => [g.section?.name ?? null, g.items.map((i) => i.id)])).toEqual([
      [null, ['b']],
      ['Verse', ['c']],
      ['Chorus', ['a', 'd']],
    ])
  })

  it('leaves out empty groups, and treats a link to a vanished section as whole-dance', () => {
    expect(groupResources([], sections)).toEqual([])
    const groups = groupResources([link({ id: 'a', sectionId: 'gone' })], sections)
    expect(groups).toHaveLength(1)
    expect(groups[0].section).toBeNull()
  })
})

describe('forgetting a removed section or part', () => {
  it('turns links to a removed section into whole-dance links, and leaves the others alone', () => {
    const out = withoutSection([link({ id: 'a', sectionId: 's1', partId: 'p' }), link({ id: 'b', sectionId: 's2' })], 's1')
    expect(out.map((r) => [r.id, r.sectionId, r.partId])).toEqual([
      ['a', null, 'p'],
      ['b', 's2', null],
    ])
  })

  it('turns links to a removed part into links to any part, and leaves the others alone', () => {
    const out = withoutPart([link({ id: 'a', partId: 'p1', sectionId: 's' }), link({ id: 'b', partId: 'p2' })], 'p1')
    expect(out.map((r) => [r.id, r.partId, r.sectionId])).toEqual([
      ['a', null, 's'],
      ['b', 'p2', null],
    ])
  })
})

describe('problemWithResources', () => {
  const project = createEmptyProject()
  const sectionId = project.sections[0].id
  const partId = project.parts[0].id
  const check = (resources: unknown) => problemWithResources({ ...project, resources: resources as Resource[] })

  it('accepts none, and well-formed links attached to real sections and parts', () => {
    expect(check([])).toBeNull()
    expect(check([link({ sectionId, partId, startSec: 30 })])).toBeNull()
  })

  it('names what is wrong', () => {
    expect(check(undefined)).toMatch(/missing/)
    expect(check([null])).toMatch(/not an object/)
    expect(check([link({ id: '' })])).toMatch(/no id/)
    expect(check([link(), link()])).toMatch(/repeated/)
    expect(check([{ ...link(), title: 5 }])).toMatch(/no title/)
    expect(check([link({ url: 'javascript:alert(1)' })])).toMatch(/web address/)
    expect(check([link({ url: 'youtube.com/x' })])).toMatch(/web address/) // saved links are already in standard form
    expect(check([link({ kind: 'bogus' as never })])).toMatch(/unknown kind/)
    expect(check([link({ sectionId: 'nope' })])).toMatch(/section that does not exist/)
    expect(check([link({ partId: 'nope' })])).toMatch(/part that does not exist/)
    expect(check([link({ startSec: -1 })])).toMatch(/start time/)
    expect(check([link({ startSec: Number.NaN })])).toMatch(/start time/)
  })
})
