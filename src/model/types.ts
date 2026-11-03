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

/** Converts counts to audio time. Tempo changes can be added later. */
export interface TempoMap {
  bpm: number
  /** Audio time (seconds) at which count 0 (Set 1, Count 1) lands. */
  startOffsetSec: number
}

export interface Project {
  name: string
  stage: StageSettings
  tempo: TempoMap
  dancers: Dancer[]
  /** Always kept sorted by `count` (the store guarantees this). */
  formations: Formation[]
}
