// Core data types for a project's formations.
// Positions are stored in stage units (feet), not pixels, so the stage can be
// drawn at any screen size and the data stays the same.

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
  /** dancerId -> position on stage */
  positions: Record<Id, Point>
}

export interface StageSettings {
  width: number // feet
  depth: number // feet
}

export interface Project {
  name: string
  stage: StageSettings
  dancers: Dancer[]
  formations: Formation[]
}
