import { describe, expect, it } from 'vitest'
import {
  canRedo,
  canUndo,
  COALESCE_MS,
  editGroup,
  emptyHistory,
  MAX_HISTORY,
  record,
  redo,
  undo,
} from './history'
import { createEmptyProject } from './project'
import type { Project } from './types'

// The history works on any snapshot type; numbers keep these tests readable.
describe('history', () => {
  it('starts empty: nothing to undo or redo, and stepping does nothing', () => {
    const h = emptyHistory<number>()
    expect(canUndo(h)).toBe(false)
    expect(canRedo(h)).toBe(false)
    expect(undo(h, 1)).toBeNull()
    expect(redo(h, 1)).toBeNull()
  })

  it('undo returns the previous snapshot and redo comes back to where we were', () => {
    let h = record(emptyHistory<number>(), 1, null, 0) // 1 -> 2
    h = record(h, 2, null, 0) // 2 -> 3
    const back = undo(h, 3)!
    expect(back.document).toBe(2)
    expect(canRedo(back.history)).toBe(true)
    const again = undo(back.history, 2)!
    expect(again.document).toBe(1)
    expect(canUndo(again.history)).toBe(false)

    const forward = redo(again.history, 1)!
    expect(forward.document).toBe(2)
    expect(redo(forward.history, 2)!.document).toBe(3)
  })

  it('a new edit after undoing drops the redo steps', () => {
    let h = record(emptyHistory<number>(), 1, null, 0)
    const back = undo(h, 2)!
    expect(canRedo(back.history)).toBe(true)
    h = record(back.history, 1, null, 0) // edit made from state 1
    expect(canRedo(h)).toBe(false)
  })

  it('keeps only the most recent MAX_HISTORY steps', () => {
    let h = emptyHistory<number>()
    for (let i = 0; i < MAX_HISTORY + 25; i++) h = record(h, i, null, 0)
    expect(h.past).toHaveLength(MAX_HISTORY)
    expect(h.past[0]).toBe(25) // the oldest 25 were forgotten
    expect(h.past[MAX_HISTORY - 1]).toBe(MAX_HISTORY + 24)
  })

  it('does not change the history it was given', () => {
    const h = record(emptyHistory<number>(), 1, null, 0)
    const snapshot = JSON.stringify(h)
    undo(h, 2)
    redo(h, 2)
    record(h, 2, null, 0)
    expect(JSON.stringify(h)).toBe(snapshot)
  })

  describe('merging typing into one step', () => {
    it('merges edits in the same group made close together, keeping the first "before"', () => {
      let h = record(emptyHistory<string>(), 'a', 'name:x', 0)
      h = record(h, 'ab', 'name:x', 300)
      h = record(h, 'abc', 'name:x', 600)
      expect(h.past).toEqual(['a'])
      expect(undo(h, 'abcd')!.document).toBe('a')
    })

    it('keeps merging while the typing continues, even past a second in total', () => {
      let h = record(emptyHistory<string>(), 'a', 'name:x', 0)
      for (let t = 600; t <= 3000; t += 600) h = record(h, 'x', 'name:x', t)
      expect(h.past).toHaveLength(1)
    })

    it('starts a new step after a pause', () => {
      let h = record(emptyHistory<string>(), 'a', 'name:x', 0)
      h = record(h, 'ab', 'name:x', COALESCE_MS + 1)
      expect(h.past).toEqual(['a', 'ab'])
    })

    it('does not merge different groups, or ungrouped edits', () => {
      let h = record(emptyHistory<string>(), 'a', 'name:x', 0)
      h = record(h, 'b', 'name:y', 10)
      h = record(h, 'c', null, 20)
      h = record(h, 'd', null, 30)
      expect(h.past).toEqual(['a', 'b', 'c', 'd'])
    })

    it('does not merge across an undo', () => {
      let h = record(emptyHistory<string>(), 'a', 'name:x', 0)
      const back = undo(h, 'ab')!
      h = record(back.history, 'a', 'name:x', 10)
      expect(h.past).toEqual(['a'])
      expect(h.lastGroup?.key).toBe('name:x')
      // ...and the step after the undo was not swallowed into a stale group:
      const stepped = undo(record(emptyHistory<string>(), 'a', 'name:x', 0), 'ab')!
      expect(stepped.history.lastGroup).toBeNull()
    })

    it('still clears redo when merging', () => {
      let h = record(emptyHistory<string>(), 'a', 'name:x', 0)
      h = undo(h, 'ab')!.history
      h = record(h, 'a', 'name:x', 10)
      h = record(h, 'a2', 'name:x', 20)
      expect(canRedo(h)).toBe(false)
    })
  })
})

describe('editGroup', () => {
  const base = (): Project => {
    const p = createEmptyProject('Dance')
    return { ...p, dancers: [{ id: 'd1', name: 'Maya' }, { id: 'd2', name: 'Jo' }] }
  }
  const rename = (p: Project, key: 'dancers' | 'formations' | 'parts' | 'sections', i: number, name: string): Project => ({
    ...p,
    [key]: (p[key] as { name: string }[]).map((x, j) => (j === i ? { ...x, name } : x)),
  })

  it('names the thing being renamed', () => {
    const before = base()
    expect(editGroup(before, rename(before, 'dancers', 1, 'Joy'))).toBe('name:dancers:d2')
    expect(editGroup(before, rename(before, 'formations', 0, 'Opening'))).toBe(`name:formations:${before.formations[0].id}`)
    expect(editGroup(before, rename(before, 'parts', 0, 'Floor'))).toBe(`name:parts:${before.parts[0].id}`)
    expect(editGroup(before, rename(before, 'sections', 0, 'Verse'))).toBe(`name:sections:${before.sections[0].id}`)
    expect(editGroup(before, { ...before, name: 'Spring show' })).toBe('name:project')
  })

  it('is null for anything that is more than one rename', () => {
    const before = base()
    expect(editGroup(before, before)).toBeNull()
    expect(editGroup(before, { ...before, dancers: [...before.dancers, { id: 'd3', name: 'New' }] })).toBeNull()
    expect(editGroup(before, { ...before, dancers: before.dancers.slice(1) })).toBeNull()
    expect(editGroup(before, { ...before, stage: { width: 50, depth: 30 } })).toBeNull()
  })

  it('is null when a rename comes with another change in the same edit', () => {
    const before = base()
    const renamed = rename(before, 'dancers', 0, 'Mia')
    expect(editGroup(before, { ...renamed, name: 'Other' })).toBeNull()
    expect(editGroup(before, rename(renamed, 'dancers', 1, 'Joy'))).toBeNull()
    expect(editGroup(before, rename(renamed, 'parts', 0, 'Floor'))).toBeNull()
  })

  it('is null when something besides the name changed (a formation retimed, a part recoloured)', () => {
    const before = base()
    const retimed = { ...before, formations: before.formations.map((f) => ({ ...f, count: f.count + 8 })) }
    expect(editGroup(before, retimed)).toBeNull()
    const recoloured = { ...before, parts: before.parts.map((p) => ({ ...p, color: 'red' as const })) }
    expect(editGroup(before, recoloured)).toBeNull()
    // renamed AND recoloured in one step is not a pure rename
    const both = { ...before, parts: before.parts.map((p) => ({ ...p, name: 'X', color: 'red' as const })) }
    expect(editGroup(before, both)).toBeNull()
  })
})
