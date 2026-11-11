// Undo/redo as a pure data structure. It knows nothing about React, stores or
// what a "document" contains: give it snapshots and it gives them back.
//
// Snapshots are cheap here because the store updates immutably: consecutive
// project snapshots share everything that did not change.

import type { Project } from './types'

export interface History<D> {
  /** Earlier snapshots, oldest first. The last one is what undo returns to. */
  past: D[]
  /** Snapshots undone and available to redo, the next redo first. */
  future: D[]
  /** The text-editing group the latest step belongs to, so typing merges into one step. */
  lastGroup: { key: string; at: number } | null
}

/** How many steps are kept. */
export const MAX_HISTORY = 100
/** Edits to the same name closer together than this (ms) are one undo step. */
export const COALESCE_MS = 1000

export function emptyHistory<D>(): History<D> {
  return { past: [], future: [], lastGroup: null }
}

export const canUndo = (h: History<unknown>) => h.past.length > 0
export const canRedo = (h: History<unknown>) => h.future.length > 0

/**
 * Remember `before` (the document as it was) because it just changed. Any redo
 * history is dropped, as in every editor. If `group` matches the previous step's
 * group and it was moments ago (within `windowMs`), nothing is added: the earlier
 * snapshot is already the state before the whole burst. A group the person opened on
 * purpose (a take of taps) passes `Infinity` so it lasts as long as it is open.
 */
export function record<D>(
  h: History<D>,
  before: D,
  group: string | null,
  now: number,
  windowMs: number = COALESCE_MS,
): History<D> {
  const merge = group !== null && h.lastGroup?.key === group && now - h.lastGroup.at < windowMs
  if (merge) return { past: h.past, future: [], lastGroup: { key: group, at: now } }
  return {
    past: [...h.past, before].slice(-MAX_HISTORY),
    future: [],
    lastGroup: group === null ? null : { key: group, at: now },
  }
}

export interface Step<D> {
  history: History<D>
  /** The snapshot to show now. */
  document: D
}

/** Step back. `current` is saved so redo can return to it. Null when there is nothing to undo. */
export function undo<D>(h: History<D>, current: D): Step<D> | null {
  if (h.past.length === 0) return null
  return {
    document: h.past[h.past.length - 1],
    history: { past: h.past.slice(0, -1), future: [current, ...h.future], lastGroup: null },
  }
}

/** Step forward again. Null when there is nothing to redo. */
export function redo<D>(h: History<D>, current: D): Step<D> | null {
  if (h.future.length === 0) return null
  return {
    document: h.future[0],
    history: { past: [...h.past, current], future: h.future.slice(1), lastGroup: null },
  }
}

const sameEntity = (a: object, b: object) => {
  const ka = Object.keys(a) as (keyof typeof a)[]
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k as keyof typeof b])
}

const COLLECTIONS = ['dancers', 'formations', 'parts', 'sections'] as const
const OTHER_KEYS = ['stage', 'tempo', 'song', 'assignments'] as const

/**
 * If the only difference between two projects is one thing's name being edited
 * (typing in a rename box fires an edit per keystroke), return a key naming that
 * thing so `record` can merge the keystrokes into one undo step. Otherwise null.
 */
export function editGroup(before: Project, after: Project): string | null {
  if (OTHER_KEYS.some((k) => before[k] !== after[k])) return null

  const nameChanged = before.name !== after.name
  let found: string | null = nameChanged ? 'name:project' : null

  for (const key of COLLECTIONS) {
    const a = before[key] as { id: string; name: string }[]
    const b = after[key] as { id: string; name: string }[]
    if (a === b) continue
    if (a.length !== b.length) return null
    for (let i = 0; i < a.length; i++) {
      if (a[i] === b[i]) continue
      const sameThing =
        a[i].id === b[i].id && a[i].name !== b[i].name && sameEntity({ ...a[i], name: b[i].name }, b[i])
      if (!sameThing || found !== null) return null // a second change, or more than a rename
      found = `name:${key}:${a[i].id}`
    }
  }
  return found
}
