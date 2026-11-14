// Core data types for a project (the saved "document").
// Positions are stored in stage units (feet), not pixels, so the stage can be
// drawn at any screen size and the data stays the same.
// Timing is stored in counts, never seconds (see the product plan, 3.1).

export type Id = string

export interface Point {
  x: number // feet from stage left edge (audience's left)
  y: number // feet from the back of the stage (upstage = 0)
}

export interface Dancer {
  id: Id
  name: string
}

export interface Formation {
  id: Id
  name: string
  /**
   * Where this formation lands in the song, as an absolute count.
   * 0 = "Set 1, Count 1", 8 = "Set 2, Count 1", and so on.
   * Dancers ARRIVE at their positions on this count.
   */
  count: number
  /** How many counts before `count` the dancers spend travelling here. */
  transitionCounts: number
  /** dancerId -> position on stage */
  positions: Record<Id, Point>
}

export interface StageSettings {
  width: number // feet
  depth: number // feet
}

/** A change of speed partway through the song, from `atCount` onward. */
interface TempoChange {
  atCount: number
  bpm: number
}

/** Converts counts to audio time. */
export interface TempoMap {
  bpm: number
  /** Audio time (seconds) at which count 0 (Set 1, Count 1) lands. */
  startOffsetSec: number
  /**
   * Tempo changes after the start. Always empty for now: the saved shape has room
   * for them (decisions/0013), but `countToSeconds` / `secondsToCount` do not read
   * them yet, so nothing may add one until they do.
   */
  changes: TempoChange[]
}

/**
 * The song's details. The audio file itself is NOT in the project: it is kept
 * separately on the device, found by `hash`, so a project opened elsewhere can ask
 * for the file again and recognise it (decisions/0013).
 */
export interface Song {
  /** The file's name, for display. */
  name: string
  durationSec: number
  /** File size in bytes. */
  size: number
  /** e.g. "audio/mpeg". */
  mime: string
  /** SHA-256 of the file contents, hex. Identifies the file wherever it is stored. */
  hash: string
}

/**
 * Part colours are a fixed palette, stored by id (not hex) so each theme can
 * tune the actual colour. The values live in src/index.css as --part-<id>.
 */
export type PartColorId = 'blue' | 'red' | 'green' | 'orange' | 'sky' | 'pink' | 'yellow' | 'gray'

/** A colour-coded subgroup doing its own choreography (plan §2). */
export interface Part {
  id: Id
  name: string
  color: PartColorId
  /**
   * The sections this part applies to, or `null` for all sections (including
   * ones added later). An empty list means it applies nowhere.
   */
  sectionIds: Id[] | null
}

/**
 * A stretch of the song (e.g. "Verse 1"). Sections are contiguous: each runs
 * from its `startCount` until the next section starts, and the first always
 * starts at count 0. So every count belongs to exactly one section.
 */
export interface Section {
  id: Id
  name: string
  startCount: number
}

/** sectionId -> dancerId -> partId. A missing entry means "no part yet". */
export type Assignments = Record<Id, Record<Id, Id>>

/** What a link is, for finding the right one ("the tutorial for the chorus"). */
export type ResourceKind = 'tutorial' | 'reference' | 'rehearsal' | 'document' | 'other'

/**
 * A web link attached to the project: a tutorial video, a reference, a document. Optionally about one section
 * and/or one part. Nothing is fetched from the link: the app only shows it and opens it in a new tab.
 */
export interface Resource {
  id: Id
  title: string
  /** An http or https address (`normalizeUrl` in model/resources.ts is the one rule for that). */
  url: string
  kind: ResourceKind
  /** The section it is about, or null for the whole dance. */
  sectionId: Id | null
  /** The part it is about, or null for any part. */
  partId: Id | null
  /** Where in a video to start, in seconds, or null. Shown to the person; the address is never changed. */
  startSec: number | null
}

export interface Project {
  name: string
  stage: StageSettings
  tempo: TempoMap
  /** The attached song, or null if none yet. */
  song: Song | null
  dancers: Dancer[]
  /** Always kept sorted by `count` (the store guarantees this). */
  formations: Formation[]
  parts: Part[]
  /** Always kept sorted by `startCount`, first at 0, at least one (the store guarantees this). */
  sections: Section[]
  assignments: Assignments
  /** Links to videos and documents, in the order they were added. */
  resources: Resource[]
}
